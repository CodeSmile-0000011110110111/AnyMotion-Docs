// GDScript language loader for DocFX
// Since DocFX's hljs is not exposed globally, we need to manually highlight GDScript blocks
import GDScript from './gdscript.min.js';

// Manual highlighting function based on GDScript language definition
function highlightGDScriptBlock(block) {
    const code = block.textContent;
    const langDef = GDScript({
        // Mock hljs helpers
        NUMBER_MODE: { className: 'hljs-number', begin: /\b\d+(\.\d+)?\b/ },
        HASH_COMMENT_MODE: { className: 'hljs-comment', begin: /#/, end: /$/ },
        QUOTE_STRING_MODE: { className: 'hljs-string', begin: /"/, end: /"/, illegal: /\n/ },
        UNDERSCORE_TITLE_MODE: { className: 'hljs-title', begin: /[a-zA-Z_]\w*/ }
    });

    // Additional Godot node types and classes
    const godotTypes = ['Node3D', 'Node2D', 'Node', 'CharacterBody3D', 'CharacterBody2D', 'StaticBody3D', 'StaticBody2D',
        'RigidBody3D', 'RigidBody2D', 'Area3D', 'Area2D', 'CollisionShape3D', 'CollisionShape2D', 'MeshInstance3D',
        'Sprite2D', 'Sprite3D', 'Camera3D', 'Camera2D', 'Light3D', 'Light2D', 'Control', 'Button', 'Label',
        'TextEdit', 'LineEdit', 'Panel', 'Container', 'VBoxContainer', 'HBoxContainer', 'Input',
        'translate', 'get_vector', 'get_action_strength'];

    // Escape HTML to prevent issues
    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply highlighting in order: comments, strings, then keywords/builtins/literals

    // Comments (# to end of line) - do first to protect content
    highlighted = highlighted.replace(/(#[^\n]*)/g, '<span class="hljs-comment">$1</span>');

    // Strings - do before keywords to protect string content
    highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hljs-string">$1</span>');
    highlighted = highlighted.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="hljs-string">$1</span>');

    // Special methods (starting with underscore like _ready, _process)
    highlighted = highlighted.replace(/\b(_[a-zA-Z_]\w*)/g, '<span class="hljs-built_in">$1</span>');

    // Function definitions (func keyword followed by name) - special case
    highlighted = highlighted.replace(/\b(func)\b(\s+)([a-zA-Z_]\w*)/g, '<span class="hljs-keyword">$1</span>$2<span class="hljs-title function_">$3</span>');

    // Class definitions
    highlighted = highlighted.replace(/\b(class)\b(\s+)([a-zA-Z_]\w*)/g, '<span class="hljs-keyword">$1</span>$2<span class="hljs-title class_">$3</span>');

    // Extends
    highlighted = highlighted.replace(/\b(extends)\b(\s+)([a-zA-Z_]\w*)/g, '<span class="hljs-keyword">$1</span>$2<span class="hljs-title class_ inherited__">$3</span>');

    // Keywords - wrap in a function to avoid matching inside already-created spans
    const keywords = langDef.keywords.keyword.split(' ').filter(k => k && k !== 'func' && k !== 'class' && k !== 'extends');
    keywords.forEach(kw => {
        const regex = new RegExp('(?<!<[^>]*)\\b(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b(?![^<]*>)', 'g');
        highlighted = highlighted.replace(regex, '<span class="hljs-keyword">$1</span>');
    });

    // Godot node types
    godotTypes.forEach(type => {
        const regex = new RegExp('(?<!<[^>]*)\\b(' + type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b(?![^<]*>)', 'g');
        highlighted = highlighted.replace(regex, '<span class="hljs-type">$1</span>');
    });

    // Built-in types/functions
    const builtins = langDef.keywords.built_in.split(' ').filter(b => b);
    builtins.forEach(bi => {
        const regex = new RegExp('(?<!<[^>]*)\\b(' + bi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b(?![^<]*>)', 'g');
        highlighted = highlighted.replace(regex, '<span class="hljs-built_in">$1</span>');
    });

    // Literals
    const literals = langDef.keywords.literal.split(' ').filter(l => l);
    literals.forEach(lit => {
        const regex = new RegExp('(?<!<[^>]*)\\b(' + lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b(?![^<]*>)', 'g');
        highlighted = highlighted.replace(regex, '<span class="hljs-literal">$1</span>');
    });

    // Numbers - avoid matching inside spans
    highlighted = highlighted.replace(/(?<!<[^>]*)\b(\d+\.?\d*)\b(?![^<]*>)/g, '<span class="hljs-number">$1</span>');

    block.innerHTML = highlighted;
    block.classList.add('hljs');
    block.classList.add('language-gdscript');
}

// Find and highlight all GDScript blocks
function processGDScriptBlocks() {
    const blocks = document.querySelectorAll('pre code.lang-gdscript, pre code.language-gdscript, pre code.lang-godot, pre code.language-godot');

    blocks.forEach(block => {
        // Only process if not already highlighted
        if (!block.classList.contains('hljs-manual')) {
            block.classList.add('hljs-manual');
            highlightGDScriptBlock(block);
        }
    });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(processGDScriptBlocks, 100);
        setTimeout(processGDScriptBlocks, 500);
    });
} else {
    // DOM already loaded
    setTimeout(processGDScriptBlocks, 100);
    setTimeout(processGDScriptBlocks, 500);
}
