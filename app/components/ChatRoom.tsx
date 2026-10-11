'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Users, Circle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Message = { id: string; user: string; text: string; ts: number };

const ROOM = 'degen-lounge';

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [online, setOnline] = useState(1);
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('degenos-username') || 'degen-' + Math.random().toString(36).slice(2, 6);
    setUsername(saved);
    localStorage.setItem('degenos-username', saved);
  }, []);

  // Load history + subscribe
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !username) return;

    let mounted = true;
    setLoadingHistory(true);

    // Load last 100 messages
    supabase
      .from('messages')
      .select('id, username, text, created_at')
      .eq('room', ROOM)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data) {
          const history: Message[] = data.reverse().map(row => ({
            id: row.id,
            user: row.username,
            text: row.text,
            ts: new Date(row.created_at).getTime(),
          }));
          setMessages(history);
        }
        setLoadingHistory(false);
      });

    // Realtime channel: presence + new messages
    const channel = supabase.channel('degenos-lounge', {
      config: { presence: { key: username } },
    });

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room=eq.${ROOM}` }, (payload) => {
        const row = payload.new as any;
        setMessages(prev => {
          if (prev.some(m => m.id === row.id)) return prev;
          return [...prev.slice(-199), {
            id: row.id,
            user: row.username,
            text: row.text,
            ts: new Date(row.created_at).getTime(),
          }];
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnline(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          await channel.track({ user: username, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !username || !supabase) return;

    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ room: ROOM, username, text })
      .select('id, username, text, created_at')
      .single();

    if (error) {
      console.error('Send failed', error);
      // Optimistic fallback only if insert fails and not configured
      return;
    }

    // Optimistic add (Realtime will also deliver it; dedupe by id)
    if (data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          user: data.username,
          text: data.text,
          ts: new Date(data.created_at).getTime(),
        }];
      });
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="chat-shell">
        <div className="chat-setup">
          <h3>Social chat room + history</h3>
          <p>Real-time multi-user chat with persistent message history. Connect Supabase and run the schema.</p>
          <ol>
            <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a></li>
            <li>Run <code>supabase/messages.sql</code> in the SQL Editor</li>
            <li>Enable Realtime on the <code>messages</code> table (Database → Replication)</li>
            <li>Add env vars:</li>
          </ol>
          <pre>NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</pre>
          <p className="chat-note">Until configured, chat is unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-shell">
      <div className="chat-header">
        <div className="chat-status">
          <Circle size={8} className={connected ? 'online' : 'offline'}/>
          <span>{connected ? 'Connected' : 'Connecting…'}</span>
          <Users size={14}/> {online} online
        </div>
        <div className="chat-room-name"># degen-lounge</div>
      </div>
      <div className="chat-messages">
        {loadingHistory && <div className="chat-empty">Loading history…</div>}
        {!loadingHistory && messages.length === 0 && <div className="chat-empty">No messages yet. Say something.</div>}
        {messages.map(m => (
          <div key={m.id} className={'chat-msg ' + (m.user === username ? 'mine' : '')}>
            <span className="chat-user">{m.user}</span>
            <span className="chat-text">{m.text}</span>
            <span className="chat-time">{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div className="chat-input-row">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={`Message as ${username}…`} maxLength={500}/>
        <button onClick={send} disabled={!input.trim() || !connected} className="chat-send"><Send size={16}/></button>
      </div>
    </div>
  );
}
