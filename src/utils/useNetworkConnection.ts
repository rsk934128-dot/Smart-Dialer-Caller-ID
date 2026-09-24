import { useState, useEffect } from 'react';
import { NetworkConnectionData } from '../types';

/**
 * Extracts candidate IP addresses via WebRTC ICE negotiation (detecting local interfaces or VPN leaks)
 */
async function gatherWebRtcCandidates(): Promise<{ localIps: string[]; publicIp?: string }> {
  return new Promise((resolve) => {
    const localIps = new Set<string>();
    let publicIp: string | undefined = undefined;

    const RTCPeerConnectionClass =
      window.RTCPeerConnection ||
      (window as unknown as { webkitRTCPeerConnection?: typeof RTCPeerConnection }).webkitRTCPeerConnection;

    if (!RTCPeerConnectionClass) {
      resolve({ localIps: [], publicIp: undefined });
      return;
    }

    try {
      const pc = new RTCPeerConnectionClass({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // Timeout safety
      const timer = setTimeout(() => {
        try {
          pc.close();
        } catch {}
        resolve({ localIps: Array.from(localIps), publicIp });
      }, 2500);

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) {
          clearTimeout(timer);
          try {
            pc.close();
          } catch {}
          resolve({ localIps: Array.from(localIps), publicIp });
          return;
        }

        const candidateStr = event.candidate.candidate;
        // Regex matches IPv4 addresses
        const ipMatch = candidateStr.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (ipMatch) {
          const ip = ipMatch[1];
          // Check if candidate is private/local subnet
          if (
            ip.startsWith('10.') ||
            ip.startsWith('192.168.') ||
            ip.startsWith('172.16.') ||
            ip.startsWith('172.24.') ||
            ip.startsWith('172.31.')
          ) {
            localIps.add(ip);
          } else {
            publicIp = ip;
          }
        }
      };

      pc.createDataChannel('security_channel');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timer);
          resolve({ localIps: [], publicIp: undefined });
        });
    } catch {
      resolve({ localIps: [], publicIp: undefined });
    }
  });
}

export function useNetworkConnection(): NetworkConnectionData {
  const [networkInfo, setNetworkInfo] = useState<NetworkConnectionData>(() => {
    const nav = navigator as unknown as {
      connection?: {
        type?: string;
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
        addEventListener?: (event: string, fn: () => void) => void;
        removeEventListener?: (event: string, fn: () => void) => void;
      };
    };

    const conn = nav.connection;
    return {
      type: conn?.type || (navigator.onLine ? 'cellular_or_wifi' : 'offline'),
      effectiveType: (conn?.effectiveType as NetworkConnectionData['effectiveType']) || '4g',
      downlinkMbps: conn?.downlink || 10.0,
      rttMs: conn?.rtt || 50,
      saveData: Boolean(conn?.saveData),
      webrtcLocalIps: [],
      webrtcPublicIp: undefined,
      detectedIp: undefined,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  });

  useEffect(() => {
    let isMounted = true;

    // 1. Gather WebRTC Candidates asynchronously
    gatherWebRtcCandidates().then(({ localIps, publicIp }) => {
      if (!isMounted) return;
      setNetworkInfo((prev) => ({
        ...prev,
        webrtcLocalIps: localIps,
        webrtcPublicIp: publicIp || prev.webrtcPublicIp,
      }));
    });

    // 2. Fetch public IP / carrier info from backend middleware
    fetch('/api/security/client-info')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.success) return;
        setNetworkInfo((prev) => ({
          ...prev,
          detectedIp: data.clientIp,
        }));
      })
      .catch(() => {
        // Fallback gracefully
      });

    // 3. Network Information API change listener
    const nav = navigator as unknown as {
      connection?: {
        type?: string;
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
        addEventListener?: (event: string, fn: () => void) => void;
        removeEventListener?: (event: string, fn: () => void) => void;
      };
    };

    const updateConnection = () => {
      const conn = nav.connection;
      if (!isMounted) return;
      setNetworkInfo((prev) => ({
        ...prev,
        type: conn?.type || (navigator.onLine ? 'cellular_or_wifi' : 'offline'),
        effectiveType: (conn?.effectiveType as NetworkConnectionData['effectiveType']) || prev.effectiveType,
        downlinkMbps: conn?.downlink || prev.downlinkMbps,
        rttMs: conn?.rtt || prev.rttMs,
        saveData: Boolean(conn?.saveData),
        isOnline: navigator.onLine,
      }));
    };

    const conn = nav.connection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', updateConnection);
    }
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    return () => {
      isMounted = false;
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', updateConnection);
      }
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  return networkInfo;
}
