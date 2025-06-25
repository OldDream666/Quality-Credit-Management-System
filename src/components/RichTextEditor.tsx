import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Mark, mergeAttributes } from '@tiptap/core';
import { useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  QueueListIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  LinkIcon,
  CodeBracketIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';

// 自定义对齐图标组件
const TextAlignLeftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h8.5M3.75 17.25h16.5" />
  </svg>
);

const TextAlignCenterIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M7.75 12h8.5M3.75 17.25h16.5" />
  </svg>
);

const TextAlignRightIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M11.75 12h8.5M3.75 17.25h16.5" />
  </svg>
);

const TextAlignJustifyIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
  </svg>
);

// 创建字体大小 Mark 扩展
const FontSize = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      size: {
        default: '16px',
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => ({
          style: `font-size: ${attributes.size}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        style: 'font-size',
        getAttrs: value => ({ size: value }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  autoSave?: boolean;
}

interface MenuButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  title: string;
}

const MenuButton = ({ onClick, active, disabled, children, title }: MenuButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    type="button"
    className={`p-2 rounded hover:bg-gray-100 transition-colors ${
      active ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const RichTextEditor = ({ content, onChange, autoSave = false }: RichTextEditorProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((html: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!autoSave) {
      onChange(html);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      onChange(html);
    }, 1000);
  }, [onChange, autoSave]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
      },
    },
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleChange(html);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('输入链接URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleFontSize = (size: string) => {
    editor.chain().focus().setMark('fontSize', { size }).run();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="加粗"
        >
          <BoldIcon className="w-5 h-5" />
        </MenuButton>
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="斜体"
        >
          <ItalicIcon className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="下划线"
        >
          <UnderlineIcon className="w-5 h-5" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="无序列表"
        >
          <ListBulletIcon className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="有序列表"
        >
          <QueueListIcon className="w-5 h-5" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <MenuButton
          onClick={addLink}
          active={editor.isActive('link')}
          title="添加链接"
        >
          <LinkIcon className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="代码块"
        >
          <CodeBracketIcon className="w-5 h-5" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="左对齐"
        >
          <TextAlignLeftIcon />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="居中对齐"
        >
          <TextAlignCenterIcon />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="右对齐"
        >
          <TextAlignRightIcon />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="两端对齐"
        >
          <TextAlignJustifyIcon />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <select
          onChange={(e) => editor.chain().focus().toggleHeading({ level: Number(e.target.value) as 1 | 2 | 3 }).run()}
          className="h-9 px-2 rounded border bg-white text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
          value={[1, 2, 3].find(level => editor.isActive('heading', { level })) || ''}
        >
          <option value="">正文</option>
          <option value="1">标题1</option>
          <option value="2">标题2</option>
          <option value="3">标题3</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <select
          className="h-9 px-2 rounded border bg-white text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
          onChange={(e) => handleFontSize(e.target.value)}
          value={editor.getAttributes('fontSize').size || '16px'}
        >
          <option value="12px">小号</option>
          <option value="14px">较小</option>
          <option value="16px">正常</option>
          <option value="18px">较大</option>
          <option value="24px">大号</option>
          <option value="32px">超大</option>
          <option value="48px">特大</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <div className="relative">
          <MenuButton
            onClick={() => {
              const colorPicker = document.getElementById('colorPicker');
              if (colorPicker) {
                colorPicker.click();
              }
            }}
            title="文字颜色"
          >
            <SwatchIcon className="w-5 h-5" />
            <input
              type="color"
              id="colorPicker"
              className="absolute opacity-0 w-0 h-0"
              onChange={(e) => {
                editor.chain().focus().setColor(e.target.value).run();
              }}
            />
          </MenuButton>
        </div>

        <div className="flex-grow" />

        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销"
        >
          <ArrowUturnLeftIcon className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做"
        >
          <ArrowUturnRightIcon className="w-5 h-5" />
        </MenuButton>
      </div>

      <EditorContent 
        editor={editor} 
        className="prose prose-lg max-w-none p-6 min-h-[500px] focus:outline-none"
      />
      
      <style jsx global>{`
        .ProseMirror {
          min-height: 500px;
          padding: 1rem;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor; 