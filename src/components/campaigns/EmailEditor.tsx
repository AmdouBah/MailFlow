'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Link2, AlignLeft,
  AlignCenter, AlignRight, List, ListOrdered, Heading2, Heading3,
  Code, Undo, Redo, Image as ImageIcon, Highlighter, Type,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EmailEditorProps {
  content: string;
  onChange: (html: string) => void;
  availableVariables?: string[];
  placeholder?: string;
}

const ToolbarButton = ({
  onClick, active, disabled, children, title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    title={title}
    className={cn(
      'p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-40',
      active && 'bg-primary/10 text-primary'
    )}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-border mx-1" />;

export function EmailEditor({ content, onChange, availableVariables = [], placeholder }: EmailEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(content);
  const [showVariables, setShowVariables] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder || 'Rédigez votre email ici...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none' },
    },
  });

  const insertVariable = useCallback((variable: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`{{${variable}}}`).run();
    setShowVariables(false);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL du lien', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  if (htmlMode) {
    return (
      <div className="border border-input rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-2 bg-secondary/50 border-b border-input">
          <span className="text-xs font-medium text-muted-foreground">Mode HTML brut</span>
          <button
            type="button"
            onClick={() => {
              editor.commands.setContent(rawHtml);
              onChange(rawHtml);
              setHtmlMode(false);
            }}
            className="text-xs btn-secondary py-1 px-2"
          >
            ← Retour éditeur
          </button>
        </div>
        <textarea
          value={rawHtml}
          onChange={(e) => {
            setRawHtml(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full h-96 p-4 font-mono text-xs focus:outline-none resize-y"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="border border-input rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-secondary/30 border-b border-input">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler" disabled={!editor.can().undo()}>
          <Undo size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refaire" disabled={!editor.can().redo()}>
          <Redo size={14} />
        </ToolbarButton>
        <Divider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} title="Gras"
        ><Bold size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} title="Italique"
        ><Italic size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')} title="Souligner"
        ><UnderlineIcon size={14} /></ToolbarButton>
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Lien">
          <Link2 size={14} />
        </ToolbarButton>
        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })} title="Titre 2"
        ><Heading2 size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })} title="Titre 3"
        ><Heading3 size={14} /></ToolbarButton>
        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} title="Liste à puces"
        ><List size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')} title="Liste numérotée"
        ><ListOrdered size={14} /></ToolbarButton>
        <Divider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })} title="Gauche"
        ><AlignLeft size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })} title="Centre"
        ><AlignCenter size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })} title="Droite"
        ><AlignRight size={14} /></ToolbarButton>
        <Divider />

        {/* Color */}
        <label className="p-1.5 rounded hover:bg-secondary cursor-pointer" title="Couleur">
          <Type size={14} />
          <input
            type="color"
            className="sr-only"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          />
        </label>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')} title="Surligner"
        ><Highlighter size={14} /></ToolbarButton>
        <Divider />

        {/* Variables */}
        {availableVariables.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVariables(!showVariables)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {'{ }'} Variable <ChevronDown size={10} />
            </button>
            {showVariables && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg border border-border shadow-lg min-w-[180px]">
                {availableVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors font-mono"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto">
          <button
            type="button"
            onClick={() => { setRawHtml(editor.getHTML()); setHtmlMode(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Code size={12} /> HTML
          </button>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
