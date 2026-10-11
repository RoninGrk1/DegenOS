'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Users, Circle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Message = { id: string; user: string; text: string; ts: number };

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [online, setOnline] = useState(1);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('degenos-username') || 'degen-' + Math.random().toString(36).slice(2, 6);
    setUsername(saved);
    localStorage.setItem('degenos-username', saved);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !username) return;

    const channel = supabase.channel('degenos-lounge', {
      config: { presence: { key: username } },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev.slice(-99), payload as Message]);
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
    return () => { supabase.removeChannel(channel); };
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !username) return;
    const msg: Message = { id: Date.now().toString(36), user: username, text, ts: Date.now() };

    if (channelRef.current && connected) {
      await channelRef.current.send({ type: 'broadcast', event: 'message', payload: msg });
    } else {
      // Local preview when Supabase not connected
      setMessages(prev => [...prev, msg]);
    }
    setInput('');
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="chat-shell">
        <div className="chat-setup">
          <h3>Social chat room</h3>
          <p>Real-time multi-user chat is ready. Connect a free Supabase project to enable it for everyone.</p>
          <ol>
            <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a></li>
            <li>Enable Realtime (default on)</li>
            <li>Add these env vars:</li>
          </ol>
          <pre>NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</pre>
          <p className="chat-note">Until then, messages stay local to this browser only.</p>
        </div>
        <div className="chat-local-preview">
          <div className="chat-header"><Users size={16}/> Local preview · 1 online</div>
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={'chat-msg ' + (m.user === username ? 'mine' : '')}>
                <span className="chat-user">{m.user}</span>
                <span className="chat-text">{m.text}</span>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div className="chat-input-row">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message…" maxLength={280}/>
            <button onClick={send} className="chat-send"><Send size={16}/></button>
          </div>
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
        {messages.length === 0 && <div className="chat-empty">No messages yet. Say something.</div>}
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
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={`Message as ${username}…`} maxLength={280}/>
        <button onClick={send} disabled={!input.trim()} className="chat-send"><Send size={16}/></button>
      </div>
    </div>
  );
}
