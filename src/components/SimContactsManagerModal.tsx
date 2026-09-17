import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CardSim as SimCard,
  ShieldCheck,
  Check,
  Download,
  Plus,
  Phone,
  Search,
  AlertCircle,
  Database,
  Smartphone,
  Info,
  Radio,
  Trash2,
} from 'lucide-react';
import { Contact } from '../types';
import { Language } from '../utils/i18n';
import {
  MOCK_SIM_CARDS,
  MOCK_RAW_SIM_CONTACTS,
  RawSimContact,
  SimCardInfo,
} from '../data/mockData';
import { callPermissionService, CallPermissions } from '../services/callPermissionService';

interface SimContactsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  existingContacts: Contact[];
  onImportContacts: (newContacts: Contact[]) => void;
  onInitiateCall: (phone: string, name?: string, callMode?: 'real' | 'simulated') => void;
}

export const SimContactsManagerModal: React.FC<SimContactsManagerModalProps> = ({
  isOpen,
  onClose,
  lang,
  existingContacts,
  onImportContacts,
  onInitiateCall,
}) => {
  const isBn = lang === 'bn';

  // Permissions state
  const [permissions, setPermissions] = useState<CallPermissions>(
    callPermissionService.getPermissions()
  );
  const [selectedSlot, setSelectedSlot] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'view' | 'save_new' | 'permission_info'>('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [simContactsList, setSimContactsList] = useState<RawSimContact[]>(MOCK_RAW_SIM_CONTACTS);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New SIM Contact Form
  const [newSimName, setNewSimName] = useState('');
  const [newSimPhone, setNewSimPhone] = useState('+880 1');
  const [newSimSlot, setNewSimSlot] = useState<1 | 2>(1);

  useEffect(() => {
    const unsub = callPermissionService.subscribe((perms) => {
      setPermissions(perms);
    });
    return unsub;
  }, []);

  // Quick feedback toast
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Toggle or force enable SIM permissions
  const handleEnableSimPermissions = () => {
    callPermissionService.enableSimContactPermissions();
    setPermissions(callPermissionService.getPermissions());
    showToast(
      isBn
        ? 'সিম নম্বর দেখা ও সেভ করার পারমিশন সফলভাবে সক্রিয় হয়েছে!'
        : 'SIM contact read & write permissions activated successfully!'
    );
  };

  const isSimPermissionActive =
    permissions.readContacts &&
    permissions.writeContacts &&
    permissions.simCardContacts &&
    permissions.readPhoneNumbers;

  // Normalized digit comparison to check if a SIM contact is already imported in app
  const existingPhoneDigits = useMemo(() => {
    return new Set(existingContacts.map((c) => c.phone.replace(/[^\d]/g, '').slice(-9)));
  }, [existingContacts]);

  // Filter SIM contacts for active slot & search query
  const filteredSimContacts = useMemo(() => {
    return simContactsList.filter((item) => {
      if (item.simSlot !== selectedSlot) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.phone.includes(q);
    });
  }, [simContactsList, selectedSlot, searchQuery]);

  // Handle single contact import from SIM
  const handleImportSingle = (simContact: RawSimContact) => {
    const newContact: Contact = {
      id: `c-sim-${simContact.id}-${Date.now()}`,
      name: simContact.name,
      phone: simContact.phone,
      tag: 'SIM Contact',
      isFavorite: false,
      company: simContact.carrier,
      storageLocation: simContact.simSlot === 1 ? 'sim1' : 'sim2',
      simSlot: simContact.simSlot,
      note: isBn
        ? `সিম ${simContact.simSlot} (${simContact.carrier}) থেকে সংরক্ষিত`
        : `Imported from SIM ${simContact.simSlot} (${simContact.carrier})`,
    };

    onImportContacts([newContact]);
    showToast(
      isBn
        ? `"${simContact.name}" অ্যাপ কন্টাক্ট তালিকায় সেভ হয়েছে!`
        : `"${simContact.name}" saved to contacts list!`
    );
  };

  // Handle batch import of all contacts in active SIM slot
  const handleImportAllFromSlot = () => {
    const slotContacts = simContactsList.filter((c) => c.simSlot === selectedSlot);
    const toImport: Contact[] = slotContacts.map((simContact) => ({
      id: `c-sim-${simContact.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: simContact.name,
      phone: simContact.phone,
      tag: 'SIM Contact',
      isFavorite: false,
      company: simContact.carrier,
      storageLocation: simContact.simSlot === 1 ? 'sim1' : 'sim2',
      simSlot: simContact.simSlot,
      note: isBn
        ? `সিম ${simContact.simSlot} (${simContact.carrier}) থেকে সংরক্ষিত`
        : `Imported from SIM ${simContact.simSlot} (${simContact.carrier})`,
    }));

    if (toImport.length === 0) return;
    onImportContacts(toImport);
    showToast(
      isBn
        ? `সিম ${selectedSlot} থেকে ${toImport.length}টি নম্বর সফলভাবে যুক্ত হয়েছে!`
        : `Successfully imported ${toImport.length} numbers from SIM ${selectedSlot}!`
    );
  };

  // Save brand-new contact directly to SIM card
  const handleSaveNewToSim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimName.trim() || !newSimPhone.trim()) return;

    if (!isSimPermissionActive) {
      handleEnableSimPermissions();
    }

    const carrierName = newSimSlot === 1 ? 'Grameenphone' : 'Banglalink';
    const newSimRecord: RawSimContact = {
      id: `sim${newSimSlot}-${Date.now()}`,
      name: newSimName.trim(),
      phone: newSimPhone.trim(),
      simSlot: newSimSlot,
      carrier: carrierName,
    };

    setSimContactsList((prev) => [newSimRecord, ...prev]);

    // Also auto-add to local contacts
    const newContact: Contact = {
      id: `c-sim-${newSimRecord.id}`,
      name: newSimRecord.name,
      phone: newSimRecord.phone,
      tag: 'SIM Contact',
      isFavorite: false,
      company: carrierName,
      storageLocation: newSimSlot === 1 ? 'sim1' : 'sim2',
      simSlot: newSimSlot,
      note: isBn
        ? `সরাসরি সিম ${newSimSlot} মেমোরিতে সেভ করা হয়েছে`
        : `Saved directly to SIM ${newSimSlot} memory`,
    };
    onImportContacts([newContact]);

    showToast(
      isBn
        ? `"${newSimRecord.name}" সিম ${newSimSlot} মেমোরিতে সেভ ও সংরক্ষিত হয়েছে!`
        : `"${newSimRecord.name}" saved to SIM ${newSimSlot}!`
    );

    setNewSimName('');
    setNewSimPhone('+880 1');
    setActiveTab('view');
  };

  if (!isOpen) return null;

  return (
    <div
      id="sim-contacts-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
              <SimCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isBn ? 'সিম কার্ডের নম্বর ও পারমিশন কন্ট্রোল' : 'SIM Contacts & Permissions'}
                </h2>
                {isSimPermissionActive ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    <Check className="w-2.5 h-2.5" />
                    {isBn ? 'অন আছে' : 'Active'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {isBn ? 'অন প্রয়োজন' : 'Action Required'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                {isBn
                  ? 'সিমের কন্টাক্ট দেখা, সেভ করা এবং অ্যান্ড্রয়েড পারমিশন পরিচালনা'
                  : 'View, save SIM numbers & manage Android SIM permissions'}
              </p>
            </div>
          </div>
          <button
            id="close-sim-manager-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback notification toast */}
        {successToast && (
          <div className="mx-4 mt-3 p-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between gap-2 shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary SIM Permission Banner if NOT fully active */}
        {!isSimPermissionActive && (
          <div className="m-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {isBn ? 'সিমের নম্বর দেখার পারমিশন চালু নেই' : 'SIM Permissions Not Active'}
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  {isBn
                    ? 'সিম কার্ডে সংরক্ষিত নম্বর দেখতে ও সেভ করতে পারমিশন অন করুন।'
                    : 'Turn on permissions to read and save numbers to SIM memory.'}
                </p>
              </div>
            </div>
            <button
              id="activate-sim-permission-banner-btn"
              onClick={handleEnableSimPermissions}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm shrink-0 transition active:scale-95"
            >
              {isBn ? 'অন করুন' : 'Enable'}
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 px-4 pt-1 gap-1 text-xs font-semibold">
          <button
            id="sim-tab-view"
            onClick={() => setActiveTab('view')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'view'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {isBn ? 'সিমের নম্বর সমূহ (View)' : 'SIM Numbers'}
          </button>
          <button
            id="sim-tab-save"
            onClick={() => setActiveTab('save_new')}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1 ${
              activeTab === 'save_new'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isBn ? 'সিমে নতুন সেভ করুন' : 'Save New to SIM'}</span>
          </button>
          <button
            id="sim-tab-perms"
            onClick={() => setActiveTab('permission_info')}
            className={`py-2 px-3 border-b-2 transition flex items-center gap-1 ${
              activeTab === 'permission_info'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? 'পারমিশন সেটিংস' : 'Permissions'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
          {/* TAB 1: View & Import SIM Contacts */}
          {activeTab === 'view' && (
            <div className="space-y-3">
              {/* Dual SIM Card Selector */}
              <div className="grid grid-cols-2 gap-2">
                {MOCK_SIM_CARDS.map((sim) => {
                  const isSelected = selectedSlot === sim.slot;
                  return (
                    <button
                      key={sim.slot}
                      id={`sim-card-slot-${sim.slot}`}
                      onClick={() => setSelectedSlot(sim.slot)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {isBn ? `সিম ${sim.slot}` : `SIM ${sim.slot}`}
                        </span>
                        <SimCard
                          className={`w-4 h-4 ${
                            isSelected ? 'text-emerald-600' : 'text-neutral-400'
                          }`}
                        />
                      </div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {isBn ? sim.carrierBn : sim.carrier}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        {sim.phoneNumber || 'Ready'}
                      </p>
                      <div className="mt-2 pt-1.5 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{isBn ? 'ধারণক্ষমতা:' : 'Capacity:'}</span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {isBn
                            ? `${sim.usedCapacity}/${sim.totalCapacity}`
                            : `${sim.usedCapacity}/${sim.totalCapacity}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action bar with search & 1-click import all */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isBn
                        ? `সিম ${selectedSlot} এর নম্বর খুঁজুন...`
                        : `Search SIM ${selectedSlot} numbers...`
                    }
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  id="import-all-slot-contacts-btn"
                  onClick={handleImportAllFromSlot}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                  title={
                    isBn
                      ? `সিম ${selectedSlot} এর সকল কন্টাক্ট ইমপোর্ট করুন`
                      : 'Import all numbers from this SIM'
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isBn ? 'সবগুলো ইমপোর্ট করুন' : 'Import All'}
                  </span>
                  <span className="sm:hidden">{isBn ? 'ইমপোর্ট' : 'All'}</span>
                </button>
              </div>

              {/* List of SIM Contacts */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                {filteredSimContacts.map((contact) => {
                  const clean = contact.phone.replace(/[^\d]/g, '').slice(-9);
                  const isAlreadyImported = existingPhoneDigits.has(clean);

                  return (
                    <div
                      key={contact.id}
                      className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {contact.name}
                            </p>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shrink-0">
                              SIM {contact.simSlot}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-neutral-500 truncate">
                            {contact.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Quick Direct Real Call */}
                        <button
                          onClick={() => onInitiateCall(contact.phone, contact.name, 'real')}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition"
                          title={isBn ? 'সরাসরি কল দিন' : 'Call'}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        {/* Import Button */}
                        <button
                          onClick={() => handleImportSingle(contact)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 ${
                            isAlreadyImported
                              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          }`}
                        >
                          {isAlreadyImported ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-[10px]">{isBn ? 'সেভড' : 'Saved'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span className="text-[10px]">{isBn ? 'ইমপোর্ট' : 'Import'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredSimContacts.length === 0 && (
                  <div className="p-5 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-1">
                    <SimCard className="w-6 h-6 text-neutral-400 mx-auto" />
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      {isBn ? 'কোনো সিম নম্বর পাওয়া যায়নি' : 'No SIM contacts found'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Save New Contact to SIM Card */}
          {activeTab === 'save_new' && (
            <form onSubmit={handleSaveNewToSim} className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start gap-2.5">
                <SimCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {isBn ? 'সিম কার্ড মেমোরিতে সরাসরি সেভ' : 'Direct SIM Card Memory Write'}
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {isBn
                      ? 'এখানে নাম ও নম্বর লিখলে তা সরাসরি সিম কার্ডের চিপ মেমোরিতে (ADN Storage) সেভ হবে।'
                      : 'Writes phone number to the SIM card hardware storage via Android Telephony.'}
                  </p>
                </div>
              </div>

              {/* SIM Slot Choice */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {isBn ? 'কোন সিম কার্ডে সেভ করবেন?' : 'Target SIM Card'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setNewSimSlot(1)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                      newSimSlot === 1
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Radio className={`w-4 h-4 ${newSimSlot === 1 ? 'text-emerald-600' : 'text-neutral-400'}`} />
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {isBn ? 'সিম ১ (গ্রামীণফোন)' : 'SIM 1 (GP)'}
                        </p>
                        <p className="text-[10px] text-neutral-500">Slot 1</p>
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setNewSimSlot(2)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                      newSimSlot === 2
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Radio className={`w-4 h-4 ${newSimSlot === 2 ? 'text-emerald-600' : 'text-neutral-400'}`} />
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {isBn ? 'সিম ২ (বাংলালিংক)' : 'SIM 2 (BL)'}
                        </p>
                        <p className="text-[10px] text-neutral-500">Slot 2</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isBn ? 'কন্টাক্টের নাম' : 'Contact Name'}
                </label>
                <input
                  type="text"
                  required
                  value={newSimName}
                  onChange={(e) => setNewSimName(e.target.value)}
                  placeholder={isBn ? 'যেমন: চাচা, অফিস ম্যানেজার' : 'e.g. John Doe'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  required
                  value={newSimPhone}
                  onChange={(e) => setNewSimPhone(e.target.value)}
                  placeholder="+880 1..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isBn ? `সিম ${newSimSlot} মেমোরিতে সেভ করুন` : `Save to SIM ${newSimSlot}`}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Permission Settings & Native Android Guide */}
          {activeTab === 'permission_info' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                      {isBn ? 'সিম কন্টাক্ট পড়ার পারমিশন (READ_CONTACTS)' : 'SIM Contact Read Permission'}
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      {isBn ? 'সিম ১ ও সিম ২ এর নম্বর পড়ার অনুমতি' : 'Read SIM 1 and SIM 2 contacts'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      callPermissionService.setPermission('readContacts', !permissions.readContacts);
                      setPermissions(callPermissionService.getPermissions());
                    }}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                      permissions.readContacts ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                      {isBn ? 'সিমে সেভ করার পারমিশন (WRITE_CONTACTS)' : 'SIM Contact Write Permission'}
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      {isBn ? 'সিম কার্ড মেমোরিতে নতুন কন্টাক্ট লেখার অনুমতি' : 'Write and save contacts to SIM storage'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      callPermissionService.setPermission('writeContacts', !permissions.writeContacts);
                      setPermissions(callPermissionService.getPermissions());
                    }}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                      permissions.writeContacts ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                      {isBn ? 'সিম সাবস্ক্রিপশন ও নম্বর (READ_PHONE_NUMBERS)' : 'Telephony & Phone Numbers'}
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      {isBn ? 'সিমের ফোন নম্বর ও অপারেটর শনাক্তকরণ' : 'Detect SIM phone numbers and carriers'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      callPermissionService.setPermission('readPhoneNumbers', !permissions.readPhoneNumbers);
                      setPermissions(callPermissionService.getPermissions());
                    }}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                      permissions.readPhoneNumbers ? 'bg-emerald-600 justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>

              {/* 1-click Activate All SIM Permissions */}
              <button
                id="turn-on-all-sim-perms-btn"
                onClick={handleEnableSimPermissions}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isBn
                    ? '১-ক্লিকে সকল সিম পারমিশন অন ও সেভ করুন'
                    : 'Turn On & Save All SIM Permissions'}
                </span>
              </button>

              {/* Native Android Telephony Code info */}
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-1 font-mono text-[10px] text-neutral-600 dark:text-neutral-400">
                <p className="font-bold text-neutral-800 dark:text-neutral-200 font-sans text-xs">
                  Android Native SIM Content Provider:
                </p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  Uri.parse("content://icc/adn") // SIM Contacts URI
                </p>
                <p className="text-neutral-500">
                  SubscriptionManager.from(context).getActiveSubscriptionInfoList()
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
