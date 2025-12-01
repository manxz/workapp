"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trash, 
  CalendarBlank,
  ArrowsClockwise,
  UserCirclePlus,
  VideoCamera,
  Notepad,
  MapPin,
  CaretDown,
  Copy,
  ArrowRight,
  X,
} from '@phosphor-icons/react';
import { 
  CalendarEvent, 
  Calendar, 
  UserSummary, 
  EventPayload, 
  RepeatType,
  REPEAT_OPTIONS,
  EventPanelMode,
} from '../types';
import { useParticipantSearch } from '../hooks/useParticipantSearch';
import { useLocationAutocomplete } from '../hooks/useLocationAutocomplete';

type EventPanelProps = {
  mode: EventPanelMode;
  event?: CalendarEvent | null;
  calendars: Calendar[];
  initialStart?: Date;
  initialEnd?: Date;
  defaultCalendarId?: string;
  currentUser?: UserSummary | null;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (payload: EventPayload) => void;
  onDelete?: () => void;
  onClose: () => void;
  onVideoCallToggle?: (enabled: boolean) => Promise<void>;
  onTitleChange?: (title: string) => void;
  onAllDayChange?: (allDay: boolean) => void;
  onRsvp?: (response: 'accepted' | 'declined' | 'tentative') => Promise<void>;
};

export default function EventPanel({
  mode,
  event,
  calendars,
  initialStart,
  initialEnd,
  defaultCalendarId,
  currentUser,
  canEdit,
  isSaving,
  onSave,
  onDelete,
  onClose,
  onVideoCallToggle,
  onTitleChange,
  onAllDayChange,
  onRsvp,
}: EventPanelProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [participants, setParticipants] = useState<UserSummary[]>([]);
  const [videoCallEnabled, setVideoCallEnabled] = useState(false);
  const [videoCallLoading, setVideoCallLoading] = useState(false);
  const [meetingNotesEnabled, setMeetingNotesEnabled] = useState(false);
  const [location, setLocation] = useState('');
  const [calendarId, setCalendarId] = useState('work');
  
  // Dropdown states
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  
  // Refs for click-outside handling
  const participantDropdownRef = useRef<HTMLDivElement>(null);
  
  // Participant search
  const participantSearch = useParticipantSearch();
  
  // Location autocomplete
  const locationAutocomplete = useLocationAutocomplete();

  // Initialize form from event or defaults
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setAllDay(event.allDay);
      setStartDate(new Date(event.start));
      setEndDate(new Date(event.end));
      setRepeatType(event.repeat.type);
      setRepeatEnabled(event.repeat.type !== 'none');
      setVideoCallEnabled(event.videoCall?.enabled || false);
      setLocation(event.location || '');
      locationAutocomplete.reset(event.location || '');
      setCalendarId(event.calendarId);
      // Load participants from event - they come as UserSummary objects from the API
      setParticipants(event.participants || []);
    } else {
      setTitle('');
      setDescription('');
      setAllDay(false);
      setStartDate(initialStart || new Date());
      setEndDate(initialEnd || new Date(Date.now() + 30 * 60 * 1000));
      setRepeatType('none');
      setRepeatEnabled(false);
      setVideoCallEnabled(false);
      setLocation('');
      locationAutocomplete.reset('');
      setCalendarId(defaultCalendarId || 'work');
      // Include current user as participant when creating a new event
      setParticipants(currentUser ? [currentUser] : []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, initialStart, initialEnd, defaultCalendarId, currentUser]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle click outside participant dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showParticipantPicker &&
        participantDropdownRef.current &&
        !participantDropdownRef.current.contains(e.target as Node)
      ) {
        setShowParticipantPicker(false);
        participantSearch.closePicker();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showParticipantPicker, participantSearch]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    
    const payload: EventPayload = {
      title: title.trim(),
      description: description.trim() || null,
      calendarId,
      participants: participants, // Full UserSummary objects
      participantEmails: participants.map(p => p.email).filter((e): e is string => !!e),
      allDay,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      repeat: {
        type: repeatEnabled ? repeatType : 'none',
      },
      location: location.trim() || null,
      // For new events, pass enabled flag to create Google Meet
      // For existing events, use the existing videoCall data
      videoCall: videoCallEnabled 
        ? (event?.videoCall || { enabled: true, provider: 'google_meet', link: '', code: '' })
        : null,
    };
    
    onSave(payload);
  }, [title, description, calendarId, participants, allDay, startDate, endDate, repeatEnabled, repeatType, location, videoCallEnabled, event, onSave]);

  // Handle video call toggle
  const handleVideoCallToggle = async (enabled: boolean) => {
    setVideoCallLoading(true);
    try {
      await onVideoCallToggle?.(enabled);
      setVideoCallEnabled(enabled);
    } finally {
      setVideoCallLoading(false);
    }
  };

  // Add participant
  const addParticipant = (user: UserSummary) => {
    if (!participants.find(p => p.id === user.id)) {
      setParticipants([...participants, user]);
    }
    setShowParticipantPicker(false);
    participantSearch.closePicker();
  };

  // Remove participant
  const removeParticipant = (userId: string) => {
    setParticipants(participants.filter(p => p.id !== userId));
  };

  // Format time for display
  const formatTimeDisplay = (date: Date): string => {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return minute === 0 ? `${hour12} ${ampm}` : `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Parse time input string (e.g., "10 am", "2:30 pm", "14:00")
  const parseTimeInput = (input: string, baseDate: Date): Date | null => {
    const trimmed = input.trim().toLowerCase();
    
    // Try parsing formats like "10 am", "2:30 pm", "10am", "2:30pm"
    const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];
    
    // Handle 12-hour format
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    // Validate
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    
    const newDate = new Date(baseDate);
    newDate.setHours(hour, minute, 0, 0);
    return newDate;
  };

  // Get selected calendar
  const selectedCalendar = calendars.find(c => c.id === calendarId);

  // Determine if editing is allowed
  // Invites (events from others) should never be editable - only RSVP is allowed
  const isEditable = mode !== 'view' && canEdit && !event?.isInvite;

  return (
    <div className="w-60 border-l border-[rgba(29,29,31,0.1)] bg-[#fafafa] h-full flex flex-col fixed right-0 top-0 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-[6px]">
        <span className="text-[16px] font-medium text-[#1d1d1f]">Event</span>
        {mode === 'edit' && canEdit && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-[7px] w-8 h-8 hover:bg-neutral-200 transition-colors"
            title="Delete event"
          >
            <Trash size={16} weight="regular" className="text-red-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Title and Description Section */}
        <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              // Notify parent for live preview in grid
              if (mode === 'create') {
                onTitleChange?.(e.target.value);
              }
            }}
            placeholder="Add title"
            disabled={!isEditable}
            className="w-full text-[12px] leading-[15px] font-medium text-[#1d1d1f] border border-[rgba(29,29,31,0.1)] rounded-lg p-2 focus:outline-none focus:border-neutral-300 disabled:bg-neutral-50 bg-white"
            autoFocus={mode === 'create'}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            disabled={!isEditable}
            className="w-full text-[12px] leading-[15px] font-medium text-[#1d1d1f] placeholder:text-[#7d7d7d] border border-[rgba(29,29,31,0.1)] rounded-lg p-2 focus:outline-none focus:border-neutral-300 disabled:bg-neutral-50 bg-white"
          />
        </div>

        {/* Date/Time Section */}
        <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-4">
          {/* All day + Time + Date group */}
          <div className="flex flex-col gap-2">
            {/* All Day Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#1d1d1f]">All day</span>
              <Toggle
                enabled={allDay}
                onChange={(enabled) => {
                  setAllDay(enabled);
                  // Notify parent for live preview in grid
                  if (mode === 'create') {
                    onAllDayChange?.(enabled);
                  }
                }}
                disabled={!isEditable}
              />
            </div>

            {/* Time Selection */}
            {!allDay && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formatTimeDisplay(startDate)}
                  onChange={(e) => {
                    const parsed = parseTimeInput(e.target.value, startDate);
                    if (parsed) setStartDate(parsed);
                  }}
                  disabled={!isEditable}
                  className="flex-1 min-w-0 text-[12px] leading-[15px] font-medium text-[#1d1d1f] bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 focus:outline-none focus:border-neutral-300 disabled:bg-neutral-50"
                />
                <ArrowRight size={16} className="text-[#7d7d7d] flex-shrink-0" />
                <input
                  type="text"
                  value={formatTimeDisplay(endDate)}
                  onChange={(e) => {
                    const parsed = parseTimeInput(e.target.value, endDate);
                    if (parsed) setEndDate(parsed);
                  }}
                  disabled={!isEditable}
                  className="flex-1 min-w-0 text-[12px] leading-[15px] font-medium text-[#1d1d1f] bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 focus:outline-none focus:border-neutral-300 disabled:bg-neutral-50"
                />
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2">
              <CalendarBlank size={16} className="text-[#1d1d1f]" />
              <span className="text-[12px] leading-[15px] font-medium text-[#1d1d1f]">{formatDateDisplay(startDate)}</span>
            </div>
          </div>

          {/* Repeats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <ArrowsClockwise size={16} className="text-[#1d1d1f]" />
              <span className="text-[12px] font-medium text-[#1d1d1f]">Repeats</span>
            </div>
            <Toggle
              enabled={repeatEnabled}
              onChange={setRepeatEnabled}
              disabled={!isEditable}
            />
          </div>
          
          {repeatEnabled && (
            <div className="relative">
              <button
                onClick={() => setShowRepeatDropdown(!showRepeatDropdown)}
                disabled={!isEditable}
                className="w-full flex items-center justify-between bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[12px] leading-[15px] font-medium text-[#1d1d1f] hover:border-neutral-300 disabled:bg-neutral-50"
              >
                <span>{REPEAT_OPTIONS.find(o => o.value === repeatType)?.label}</span>
                <CaretDown size={12} />
              </button>
              
              {showRepeatDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg shadow-lg z-10">
                  {REPEAT_OPTIONS.filter(o => o.value !== 'none').map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setRepeatType(option.value);
                        setShowRepeatDropdown(false);
                      }}
                      className="w-full flex items-center justify-between p-2 text-[12px] leading-[15px] hover:bg-neutral-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span>{option.label}</span>
                      {repeatType === option.value && <span className="text-[#06DF79]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Call Section - Own section only when enabled */}
        {videoCallEnabled && (
          <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {/* Video Call Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <VideoCamera size={16} className="text-[#1d1d1f]" />
                  <span className="text-[12px] font-medium text-[#1d1d1f]">Video call</span>
                </div>
                <Toggle
                  enabled={videoCallEnabled}
                  onChange={handleVideoCallToggle}
                  disabled={!isEditable || videoCallLoading}
                  loading={videoCallLoading}
                />
              </div>
              
              {/* Video Call Details */}
              <div className="bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg" 
                    alt="Google Meet" 
                    className="w-4 h-4"
                  />
                  <span className="text-[12px] leading-[15px] font-medium text-[#1d1d1f]">Google Meet</span>
                </div>
                {event?.videoCall && (
                  <>
                    <div className="group flex items-center gap-[2px] text-[12px] leading-[15px]">
                      <span className="text-[#7d7d7d] shrink-0">Link:</span>
                      <a 
                        href={event.videoCall.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#1d1d1f] hover:underline truncate flex-1"
                      >
                        {event.videoCall.link}
                      </a>
                      <button 
                        onClick={() => navigator.clipboard.writeText(event.videoCall!.link)}
                        className="p-0.5 hover:bg-neutral-100 rounded opacity-0 group-hover:opacity-70 transition-opacity"
                      >
                        <Copy size={12} className="text-[#7d7d7d]" />
                      </button>
                    </div>
                    {event.videoCall.code && (
                      <div className="group flex items-center gap-[2px] text-[12px] leading-[15px]">
                        <span className="text-[#7d7d7d] shrink-0">Code:</span>
                        <span className="text-[#1d1d1f] flex-1">{event.videoCall.code}</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(event.videoCall!.code || '')}
                          className="p-0.5 hover:bg-neutral-100 rounded opacity-0 group-hover:opacity-70 transition-opacity"
                        >
                          <Copy size={12} className="text-[#7d7d7d]" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Participants Section - Own section */}
        <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-2 items-center justify-center">
          <div className="flex flex-col gap-2 w-full" ref={participantDropdownRef}>
            {/* Add participants input styled as box */}
            <div className="relative">
              <div 
                className={`bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 flex items-center gap-1 cursor-text ${showParticipantPicker ? 'ring-1 ring-blue-500' : ''}`}
                onClick={() => {
                  if (isEditable) {
                    setShowParticipantPicker(true);
                    participantSearch.openPicker();
                  }
                }}
              >
                <UserCirclePlus size={16} className="text-[#1d1d1f] shrink-0" />
                <input
                  type="text"
                  placeholder="Add participants"
                  value={participantSearch.query}
                  onChange={(e) => participantSearch.search(e.target.value)}
                  onFocus={() => {
                    setShowParticipantPicker(true);
                    participantSearch.openPicker();
                  }}
                  disabled={!isEditable}
                  className="flex-1 bg-transparent text-[12px] font-medium text-[#1d1d1f] placeholder:text-[#1d1d1f] focus:outline-none"
                />
              </div>
              
              {/* Dropdown */}
              {showParticipantPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg shadow-lg z-20 max-h-[200px] overflow-y-auto">
                  {participantSearch.loading ? (
                    <div className="p-3 text-center text-[12px] text-[#7d7d7f]">Loading...</div>
                  ) : participantSearch.results.length === 0 ? (
                    <div className="p-3 text-center text-[12px] text-[#7d7d7f]">No users found</div>
                  ) : (
                    participantSearch.results
                      .filter(user => !participants.find(p => p.id === user.id))
                      .map(user => (
                        <button
                          key={user.id}
                          onClick={() => addParticipant(user)}
                          className="w-full flex items-center gap-[6px] px-2 py-2 hover:bg-neutral-50 transition-colors text-left"
                        >
                          <img
                            src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`}
                            alt={user.name}
                            className="w-[18px] h-[18px] rounded-full object-cover"
                          />
                          <span className="text-[12px] font-medium text-[#1d1d1f] truncate">{user.name}</span>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
            
            {/* Participants list - bordered container */}
            {participants.length > 0 && (
              <div className="border border-[rgba(29,29,31,0.1)] rounded-lg overflow-hidden">
                {participants.map((participant, index) => (
                  <div 
                    key={participant.id} 
                    className={`bg-white flex items-center p-2 h-[31px] group ${index < participants.length - 1 ? 'border-b border-[rgba(29,29,31,0.1)]' : ''}`}
                  >
                    <div className="flex-1 flex items-center gap-[6px]">
                      <img
                        src={participant.avatarUrl || `https://i.pravatar.cc/150?u=${participant.id}`}
                        alt={participant.name}
                        className="w-[18px] h-[18px] rounded-full object-cover"
                      />
                      <span className="text-[12px] font-medium text-[#1d1d1f]">{participant.name}</span>
                    </div>
                    {isEditable && (
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded-[5px] text-[#7d7d7f] hover:bg-neutral-200 hover:text-[#1d1d1f] transition-all"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Video Call & Meeting Notes Section */}
        <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-4 items-center justify-center">
          {/* Video Call Toggle - only show when not enabled (enabled state has its own section above) */}
          {!videoCallEnabled && (
            <div className="flex items-center justify-between w-[208px]">
              <div className="flex items-center gap-1">
                <VideoCamera size={16} className="text-[#1d1d1f]" />
                <span className="text-[12px] font-medium text-[#1d1d1f]">Video call</span>
              </div>
              <Toggle
                enabled={videoCallEnabled}
                onChange={handleVideoCallToggle}
                disabled={!isEditable || videoCallLoading}
                loading={videoCallLoading}
              />
            </div>
          )}

          {/* Meeting Notes */}
          <div className="flex items-center justify-between w-[208px]">
            <div className="flex items-center gap-1">
              <Notepad size={16} className="text-[#1d1d1f]" />
              <span className="text-[12px] font-medium text-[#1d1d1f]">Meeting notes</span>
            </div>
            <Toggle
              enabled={meetingNotesEnabled}
              onChange={setMeetingNotesEnabled}
              disabled={true} // Disabled for MVP
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-2">
          <div className="relative">
            <div className="flex items-center gap-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2">
              <MapPin size={16} className="text-[#1d1d1f] shrink-0" />
              <input
                type="text"
                value={locationAutocomplete.query}
                onChange={(e) => {
                  locationAutocomplete.handleInputChange(e.target.value);
                  setLocation(e.target.value);
                }}
                onBlur={() => {
                  // Delay close to allow click on dropdown
                  setTimeout(() => locationAutocomplete.close(), 200);
                }}
                placeholder="Location"
                disabled={!isEditable}
                className="flex-1 text-[12px] leading-[15px] font-medium text-[#1d1d1f] focus:outline-none bg-transparent disabled:cursor-not-allowed placeholder:text-[#1d1d1f]"
              />
            </div>
            
            {/* Autocomplete dropdown */}
            {locationAutocomplete.isOpen && locationAutocomplete.predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg shadow-lg z-20 max-h-[200px] overflow-y-auto">
                {locationAutocomplete.predictions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    onClick={() => {
                      const selected = locationAutocomplete.selectPrediction(prediction);
                      setLocation(selected);
                    }}
                    className="w-full flex flex-col items-start p-2 hover:bg-neutral-50 first:rounded-t-lg last:rounded-b-lg text-left"
                  >
                    <span className="text-[12px] font-medium text-[#1d1d1f]">
                      {prediction.mainText}
                    </span>
                    {prediction.secondaryText && (
                      <span className="text-[11px] text-[#7d7d7d] truncate w-full">
                        {prediction.secondaryText}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Selector Section */}
        <div className="p-4 border-b border-[rgba(29,29,31,0.1)] flex flex-col gap-2">
          <div className="relative">
            <button
              onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
              disabled={!isEditable}
              className="w-full flex items-center justify-between bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 hover:border-neutral-300 disabled:bg-neutral-50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedCalendar?.color || '#3B82F6' }}
                />
                <span className="text-[12px] leading-[15px] font-medium text-[#1d1d1f]">
                  {selectedCalendar?.name || 'Work'}
                </span>
              </div>
              <CaretDown size={12} className="text-[#1d1d1f]" />
            </button>
            
            {showCalendarDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg shadow-lg z-10">
                {calendars.filter(c => c.editable).map(calendar => (
                  <button
                    key={calendar.id}
                    onClick={() => {
                      setCalendarId(calendar.id);
                      setShowCalendarDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 text-[12px] leading-[15px] hover:bg-neutral-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: calendar.color }}
                    />
                    <span className="flex-1 text-left font-medium text-[#1d1d1f]">{calendar.name}</span>
                    {calendarId === calendar.id && <span className="text-[#06DF79]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditable && (
        <div className="p-4 flex gap-2 items-center justify-center shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-[rgba(29,29,31,0.1)] rounded-lg p-2 text-[13px] font-medium text-[#1d1d1f] hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="flex-1 bg-[#0070f3] rounded-lg p-2 text-[13px] font-medium text-white hover:bg-[#005cc5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save event'}
          </button>
        </div>
      )}

      {/* RSVP Buttons for Invites */}
      {event?.isInvite && onRsvp && (
        <div className="p-4 border-t border-[rgba(29,29,31,0.1)] shrink-0">
          <div className="text-[12px] font-medium text-[#7d7d7d] mb-2">
            Going?
            {event.myResponseStatus && event.myResponseStatus !== 'needsAction' && (
              <span className="ml-2 text-[#1d1d1f]">
                (Currently: {event.myResponseStatus === 'accepted' ? 'Yes' : event.myResponseStatus === 'declined' ? 'No' : 'Maybe'})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRsvp('accepted')}
              disabled={isSaving}
              className={`flex-1 rounded-lg p-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                event.myResponseStatus === 'accepted'
                  ? 'bg-[#0070f3] text-white'
                  : 'bg-white border border-[rgba(29,29,31,0.1)] text-[#1d1d1f] hover:bg-neutral-50'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => onRsvp('declined')}
              disabled={isSaving}
              className={`flex-1 rounded-lg p-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                event.myResponseStatus === 'declined'
                  ? 'bg-[#0070f3] text-white'
                  : 'bg-white border border-[rgba(29,29,31,0.1)] text-[#1d1d1f] hover:bg-neutral-50'
              }`}
            >
              No
            </button>
            <button
              onClick={() => onRsvp('tentative')}
              disabled={isSaving}
              className={`flex-1 rounded-lg p-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                event.myResponseStatus === 'tentative'
                  ? 'bg-[#0070f3] text-white'
                  : 'bg-white border border-[rgba(29,29,31,0.1)] text-[#1d1d1f] hover:bg-neutral-50'
              }`}
            >
              Maybe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Toggle component - reusing style from AppCard
function Toggle({ 
  enabled, 
  onChange, 
  disabled,
  loading,
}: { 
  enabled: boolean; 
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        h-4 w-7 rounded-[16px] shrink-0
        flex items-center
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${enabled 
          ? 'bg-[#05f140] justify-end px-[1.5px] py-0.5' 
          : 'bg-[#e0e0e0] justify-start px-[1.5px] py-0.5'
        }
        ${loading ? 'opacity-50' : ''}
      `}
    >
      <div className="bg-white rounded-[32px] w-[13px] h-[13px]" />
    </button>
  );
}
