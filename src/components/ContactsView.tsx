import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Star,
  Phone,
  Mail,
  Building,
  Edit2,
  Trash2,
  User,
  X,
  Check,
} from 'lucide-react';
import { Contact } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { searchContactsT9 } from '../utils/t9';

interface ContactsViewProps {
  contacts: Contact[];
  lang: Language;
  onInitiateCall: (phone: string, name?: string) => void;
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  lang,
  onInitiateCall,
  onSaveContact,
  onDeleteContact,
  onToggleFavorite,
}) => {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form states for add/edit modal
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTag, setFormTag] = useState('Friend');
  const [formNote, setFormNote] = useState('');

  const openNewModal = () => {
    setFormName('');
    setFormNameEn('');
    setFormPhone('+880 1');
    setFormEmail('');
    setFormCompany('');
    setFormTag('Friend');
    setFormNote('');
    setEditingContact(null);
    setIsNewModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setFormName(c.name);
    setFormNameEn(c.nameEn || '');
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormCompany(c.company || '');
    setFormTag(c.tag || 'Friend');
    setFormNote(c.note || '');
    setEditingContact(c);
    setIsNewModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const newOrUpdated: Contact = {
      id: editingContact ? editingContact.id : `c-${Date.now()}`,
      name: formName.trim(),
      nameEn: formNameEn.trim() || undefined,
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      company: formCompany.trim() || undefined,
      tag: formTag,
      note: formNote.trim() || undefined,
      isFavorite: editingContact ? editingContact.isFavorite : false,
    };

    onSaveContact(newOrUpdated);
    setIsNewModalOpen(false);
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.trim().toLowerCase();

    // If query is digits, run T9 search to match predictive letters
    const isNumericQuery = /^[0-9]+$/.test(q);
    const t9MatchedIds = isNumericQuery
      ? new Set(searchContactsT9(contacts, q).map((r) => r.contact.id))
      : new Set<string>();

    return contacts.filter((c) => {
      if (t9MatchedIds.has(c.id)) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
        c.phone.includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
      );
    });
  }, [contacts, searchQuery]);

  const favorites = filteredContacts.filter((c) => c.isFavorite);
  const others = filteredContacts.filter((c) => !c.isFavorite);

  return (
    <div id="contacts-component" className="flex flex-col h-full">
      {/* Top bar with Search and Add Contact Button */}
      <div className="px-4 pt-2 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="contacts-search-input"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          id="add-new-contact-header-btn"
          onClick={openNewModal}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
          title={t.addContact}
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.addContact}</span>
        </button>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* Favorites section */}
        {favorites.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{t.favorites} ({favorites.length})</span>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {favorites.map((c) => (
                <div
                  key={c.id}
                  id={`contact-card-${c.id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition group"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => onInitiateCall(c.phone, c.name)}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {c.name}
                        </p>
                        {c.nameEn && c.nameEn !== c.name && (
                          <span className="text-[11px] text-neutral-400 font-normal truncate">
                            ({c.nameEn})
                          </span>
                        )}
                        {c.tag && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {c.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        {c.phone}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`fav-toggle-${c.id}`}
                      onClick={() => onToggleFavorite(c.id)}
                      className="p-1.5 text-amber-500 hover:text-amber-600 transition"
                      title="Toggle Favorite"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      id={`contact-call-${c.id}`}
                      onClick={() => onInitiateCall(c.phone, c.name)}
                      className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                      title={t.callBtn}
                    >
                      <Phone className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      id={`edit-contact-${c.id}`}
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All / Other Contacts */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {t.allList} ({others.length})
          </div>

          {others.length === 0 && favorites.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-sm">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t.noMatchesFound}</p>
            </div>
          ) : (
            others.map((c) => (
              <div
                key={c.id}
                id={`contact-card-${c.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition group"
              >
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onInitiateCall(c.phone, c.name)}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-sm shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {c.name}
                      </p>
                      {c.nameEn && c.nameEn !== c.name && (
                        <span className="text-[11px] text-neutral-400 font-normal truncate">
                          ({c.nameEn})
                        </span>
                      )}
                      {c.company && (
                        <span className="text-[11px] text-neutral-400 truncate hidden sm:inline">
                          • {c.company}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {c.phone}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id={`fav-toggle-${c.id}`}
                    onClick={() => onToggleFavorite(c.id)}
                    className="p-1.5 text-neutral-300 hover:text-amber-500 transition"
                    title="Toggle Favorite"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    id={`contact-call-${c.id}`}
                    onClick={() => onInitiateCall(c.phone, c.name)}
                    className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                    title={t.callBtn}
                  >
                    <Phone className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    id={`edit-contact-${c.id}`}
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`delete-contact-${c.id}`}
                    onClick={() => onDeleteContact(c.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
      {isNewModalOpen && (
        <div
          id="contact-form-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingContact ? t.edit : t.addContact}
              </h3>
              <button
                id="close-contact-modal-btn"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                  {t.name} *
                </label>
                <input
                  id="contact-form-name"
                  type="text"
                  required
                  placeholder="যেমন: তানভীর আহমেদ"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                  ইংরেজি নাম / T9 কিপ্যাড ডায়ালিং নাম (ঐচ্ছিক)
                </label>
                <input
                  id="contact-form-name-en"
                  type="text"
                  placeholder="যেমন: Tanvir Ahmed"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                  {t.phone} *
                </label>
                <input
                  id="contact-form-phone"
                  type="text"
                  required
                  placeholder="+880 1711-XXXXXX"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                    {t.company}
                  </label>
                  <input
                    id="contact-form-company"
                    type="text"
                    placeholder="কোম্পানি বা পেশা"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                    ট্যাগ
                  </label>
                  <select
                    id="contact-form-tag"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  >
                    <option value="Family">Family</option>
                    <option value="Work">Work</option>
                    <option value="Friend">Friend</option>
                    <option value="Doctor">Doctor</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1 block">
                  {t.notes}
                </label>
                <input
                  id="contact-form-note"
                  type="text"
                  placeholder="সংক্ষিপ্ত মন্তব্য"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition"
                >
                  {t.cancel}
                </button>
                <button
                  id="save-contact-submit-btn"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
