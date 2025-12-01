"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, GoogleLogo, Plus, Trash, CaretDown, CaretUp, SpinnerGap } from '@phosphor-icons/react';
import { useConnectedAccounts, ConnectedAccount } from '../hooks/useConnectedAccounts';

type ConnectCalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ConnectCalendarModal({
  isOpen,
  onClose,
}: ConnectCalendarModalProps) {
  const { 
    accounts, 
    loading, 
    connectGoogle, 
    disconnectAccount,
    toggleCalendar,
  } = useConnectedAccounts();
  
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectGoogle = () => {
    connectGoogle();
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account? All synced calendars will be removed.')) {
      return;
    }
    
    setDisconnecting(accountId);
    await disconnectAccount(accountId);
    setDisconnecting(null);
  };

  const toggleExpanded = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleToggleCalendar = async (accountId: string, calendarId: string, enabled: boolean) => {
    await toggleCalendar(accountId, calendarId, enabled);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-[400px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(29,29,31,0.1)]">
          <h3 className="text-[14px] font-semibold text-[#1d1d1f]">
            Connect Calendar
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <X size={16} className="text-[#7d7d7f]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-[13px] text-[#7d7d7f]">
            Connect your Google account to sync your calendars and events.
          </p>

          {/* Google Account Button */}
          <button
            onClick={handleConnectGoogle}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[rgba(29,29,31,0.1)] rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
              <GoogleLogo size={20} weight="bold" className="text-[#4285F4]" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[13px] font-medium text-[#1d1d1f]">
                Connect Google Account
              </span>
              <p className="text-[11px] text-[#7d7d7f]">
                Import calendars from Google
              </p>
            </div>
            <Plus size={16} className="text-[#7d7d7f]" />
          </button>

          {/* Connected Accounts Section */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-[#7d7d7f] uppercase tracking-wide mb-3">
              Connected Accounts
            </p>
            
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <SpinnerGap size={20} className="text-[#7d7d7f] animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-[12px] text-[#aaaaaa] italic py-2">
                No accounts connected yet
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map(account => (
                  <ConnectedAccountItem
                    key={account.id}
                    account={account}
                    isExpanded={expandedAccounts.has(account.id)}
                    onToggleExpand={() => toggleExpanded(account.id)}
                    onDisconnect={() => handleDisconnect(account.id)}
                    onToggleCalendar={handleToggleCalendar}
                    isDisconnecting={disconnecting === account.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-neutral-50 border-t border-[rgba(29,29,31,0.1)]">
          <p className="text-[11px] text-[#7d7d7f]">
            Your calendar data is synced securely and only visible to you.
          </p>
        </div>
      </div>
    </div>
  );

  // Only render portal on client side
  if (typeof window === 'undefined') return null;
  
  return createPortal(modalContent, document.body);
}

// Connected account item component
function ConnectedAccountItem({
  account,
  isExpanded,
  onToggleExpand,
  onDisconnect,
  onToggleCalendar,
  isDisconnecting,
}: {
  account: ConnectedAccount;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDisconnect: () => void;
  onToggleCalendar: (accountId: string, calendarId: string, enabled: boolean) => void;
  isDisconnecting: boolean;
}) {
  return (
    <div className="border border-[rgba(29,29,31,0.1)] rounded-lg overflow-hidden">
      {/* Account header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white">
        <div className="w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
          <GoogleLogo size={14} weight="bold" className="text-[#4285F4]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[#1d1d1f] truncate">
            {account.email}
          </p>
          <p className="text-[10px] text-[#7d7d7f]">
            {account.synced_calendars.length} calendar{account.synced_calendars.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-neutral-100 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <CaretUp size={14} className="text-[#7d7d7f]" />
            ) : (
              <CaretDown size={14} className="text-[#7d7d7f]" />
            )}
          </button>
          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Disconnect account"
          >
            {isDisconnecting ? (
              <SpinnerGap size={14} className="text-red-500 animate-spin" />
            ) : (
              <Trash size={14} className="text-red-500" />
            )}
          </button>
        </div>
      </div>
      
      {/* Calendar list */}
      {isExpanded && account.synced_calendars.length > 0 && (
        <div className="border-t border-[rgba(29,29,31,0.1)] bg-neutral-50 px-3 py-2 space-y-1">
          {account.synced_calendars.map(calendar => (
            <label 
              key={calendar.id}
              className="flex items-center gap-2 py-1 cursor-pointer hover:bg-neutral-100 rounded px-1 -mx-1"
            >
              <input
                type="checkbox"
                checked={calendar.is_enabled}
                onChange={(e) => onToggleCalendar(account.id, calendar.id, e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-300 text-[#0070f3] focus:ring-[#0070f3]"
              />
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: calendar.color }}
              />
              <span className="text-[11px] text-[#1d1d1f] truncate flex-1">
                {calendar.name}
              </span>
              {calendar.is_primary && (
                <span className="text-[9px] text-[#7d7d7f] bg-neutral-200 px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
