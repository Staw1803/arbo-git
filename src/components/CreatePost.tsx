import React, { useState } from 'react';
import { Send, Image, Smile, Coins } from 'lucide-react';

interface CreatePostProps {
  onPublishPost: (content: string, monetized: boolean) => Promise<void>;
  userAvatar: string;
}

export default function CreatePost({ onPublishPost, userAvatar }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monetized, setMonetized] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onPublishPost(content.trim(), monetized);
      setContent('');
      setMonetized(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (error) {
      console.error('Error publishing post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="border-b border-zinc-800 p-4 bg-black/40 backdrop-blur-md">
      <div className="flex gap-4">
        <img
          src={userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover border border-zinc-800 shrink-0 select-none pointer-events-none"
        />
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            placeholder="O que está acontecendo?"
            rows={2}
            maxLength={280}
            className="w-full bg-transparent text-white placeholder-zinc-600 text-lg font-medium focus:outline-none resize-none py-1 border-none outline-none leading-relaxed"
            disabled={isSubmitting}
          />

          <button
            type="button"
            onClick={() => setMonetized(!monetized)}
            className={`self-start flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border transition-all duration-200 cursor-pointer mt-1 mb-2 ${
              monetized
                ? 'bg-amber-400/10 border-amber-400/40 text-amber-400'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <Coins className={`w-3.5 h-3.5 ${monetized ? 'text-amber-400' : ''}`} />
            <span>{monetized ? 'Gorjetas ativadas ✓' : 'Aceitar Gorjetas'}</span>
          </button>

          <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-1">
            <div className="flex items-center gap-4 text-zinc-500">
              <button type="button" className="hover:text-white transition-colors duration-150 cursor-pointer">
                <Image className="w-4 h-4" />
              </button>
              <button type="button" className="hover:text-white transition-colors duration-150 cursor-pointer">
                <Smile className="w-4 h-4" />
              </button>
              {content.length > 0 && (
                <span className={`text-[10px] font-bold tabular-nums ${content.length > 250 ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {280 - content.length}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-5 py-2 rounded-full bg-white text-black font-extrabold text-sm hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>{isSubmitting ? 'Postando...' : 'Postar'}</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
