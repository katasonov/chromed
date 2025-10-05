// FileTypes.js - Helper for file type information
// This file is auto-generated from LanguagesMenu.js

class FileTypeInfo {
    /**
     * @param {string} mimeType
     * @param {string} displayName
     * @param {string} shortName
     * @param {string[]} fileExtensions
     */
    constructor(mimeType, displayName, shortName, fileExtensions) {
        this.mimeType = mimeType;
        this.displayName = displayName;
        this.shortName = shortName;
        this.fileExtensions = fileExtensions;
    }
}


class FileTypes {

    static _fileTypes = [
        new FileTypeInfo('application/octet-stream', 'All Files', 'All Files', ['*']),
        new FileTypeInfo('text/plain', 'Text Files', 'Text Files', ['txt', 'text', 'log']),
        new FileTypeInfo('text/x-apl', 'APL', 'APL', ['apl']),
        new FileTypeInfo('text/x-asn1', 'ASN.1', 'ASN.1', ['asn1']),
        new FileTypeInfo('text/x-asterisk', 'Asterisk dialplan', 'Asterisk dialplan', ['ael']),
        new FileTypeInfo('text/x-brainfuck', 'Brainfuck', 'Brainfuck', ['bf', 'b']),
        new FileTypeInfo('text/x-csrc', 'C', 'C', ['c', 'h']),
        new FileTypeInfo('text/x-c++src', 'C++', 'C++', ['cpp', 'cxx', 'cc', 'hpp', 'h', 'hh', 'hxx', 'ino']),
        new FileTypeInfo('text/x-csharp', 'C#', 'C#', ['cs']),
        new FileTypeInfo('text/x-ceylon', 'Ceylon', 'Ceylon', ['ceylon']),
        new FileTypeInfo('text/x-clojure', 'Clojure', 'Clojure', ['clj', 'cljs', 'cljc', 'edn']),
        new FileTypeInfo('text/x-gss', 'Closure Stylesheets (GSS)', 'Closure Stylesheets (GSS)', ['gss']),
        new FileTypeInfo('text/x-cmake', 'CMake', 'CMake', ['cmake', 'cmake.in']),
        new FileTypeInfo('text/x-cobol', 'COBOL', 'COBOL', ['cob', 'cbl', 'cpy']),
        new FileTypeInfo('text/x-coffeescript', 'CoffeeScript', 'CoffeeScript', ['coffee']),
        new FileTypeInfo('text/x-common-lisp', 'Common Lisp', 'Common Lisp', ['lisp', 'lsp', 'l', 'cl', 'fasl']),
        new FileTypeInfo('text/x-crystal', 'Crystal', 'Crystal', ['cr']),
        new FileTypeInfo('text/csv', 'CSV File', 'CSV file', ['csv']),
        new FileTypeInfo('text/css', 'CSS', 'CSS', ['css']),
        new FileTypeInfo('text/x-cypher', 'Cypher', 'Cypher', ['cypher']),
        new FileTypeInfo('text/x-cython', 'Cython', 'Cython', ['pyx', 'pxd', 'pxi']),
        new FileTypeInfo('text/x-d', 'D', 'D', ['d']),
        new FileTypeInfo('text/x-dart', 'Dart', 'Dart', ['dart']),
        new FileTypeInfo('text/x-diff', 'diff', 'diff', ['diff', 'patch']),
        new FileTypeInfo('text/x-dtd', 'DTD', 'DTD', ['dtd']),
        new FileTypeInfo('text/x-dylan', 'Dylan', 'Dylan', ['dylan', 'dyl', 'intr']),
        new FileTypeInfo('text/x-ebnf', 'EBNF', 'EBNF', ['ebnf']),
        new FileTypeInfo('text/x-ecl', 'ECL', 'ECL', ['ecl']),
        new FileTypeInfo('text/x-eiffel', 'Eiffel', 'Eiffel', ['e']),
        new FileTypeInfo('text/x-elixir', 'Elixir', 'Elixir', ['ex', 'exs']),
        new FileTypeInfo('text/x-elm', 'Elm', 'Elm', ['elm']),
        new FileTypeInfo('text/x-erlang', 'Erlang', 'Erlang', ['erl', 'hrl']),
        new FileTypeInfo('text/x-factor', 'Factor', 'Factor', ['factor']),
        new FileTypeInfo('text/x-fcl', 'FCL', 'FCL', ['fcl']),
        new FileTypeInfo('text/x-forth', 'Forth', 'Forth', ['fth', 'f']),
        new FileTypeInfo('text/x-fortran', 'Fortran', 'Fortran', ['f90', 'f95', 'f03', 'f08', 'f', 'for']),
        new FileTypeInfo('text/x-fsharp', 'F#', 'F#', ['fs', 'fsi', 'fsx', 'fsscript']),
        new FileTypeInfo('text/x-gas', 'Gas (AT&T-style assembly)', 'Gas (AT&T-style assembly)', ['s', 'asm']),
        new FileTypeInfo('text/x-gherkin', 'Gherkin', 'Gherkin', ['feature']),
        new FileTypeInfo('text/x-go', 'Go', 'Go', ['go']),
        new FileTypeInfo('text/x-groovy', 'Groovy', 'Groovy', ['groovy', 'gvy', 'gy', 'gsh']),
        new FileTypeInfo('text/x-haml', 'HAML', 'HAML', ['haml']),
        new FileTypeInfo('text/x-handlebars', 'Handlebars', 'Handlebars', ['hbs', 'handlebars']),
        new FileTypeInfo('text/x-haskell-literate', 'Haskell (Literate)', 'Haskell (Literate)', ['lhs']),
        new FileTypeInfo('text/x-haxe', 'Haxe', 'Haxe', ['hx']),
        new FileTypeInfo('application/x-jsp', 'HTML embedded (JSP, ASP.NET)', 'HTML embedded (JSP, ASP.NET)', ['jsp', 'aspx']),
        new FileTypeInfo('text/html', 'HTML mixed-mode', 'HTML mixed-mode', ['html', 'htm']),
        new FileTypeInfo('message/http', 'HTTP', 'HTTP', ['http']),
        new FileTypeInfo('text/x-idl', 'IDL file', 'IDL file', ['idl']),
        new FileTypeInfo('text/x-properties', 'INI file', 'INI file', ['ini']),
        new FileTypeInfo('text/x-java', 'Java', 'Java', ['java']),
        new FileTypeInfo('application/javascript', 'JavaScript', 'JavaScript', ['js', 'mjs']),
        new FileTypeInfo('text/jsx', 'JavaScript (JSX)', 'JavaScript (JSX)', ['jsx']),
        new FileTypeInfo('text/x-jinja2', 'Jinja2', 'Jinja2', ['j2', 'jinja2']),
        new FileTypeInfo('text/x-julia', 'Julia', 'Julia', ['jl']),
        new FileTypeInfo('text/x-kotlin', 'Kotlin', 'Kotlin', ['kt', 'kts']),
        new FileTypeInfo('text/x-less', 'LESS', 'LESS', ['less']),
        new FileTypeInfo('text/x-livescript', 'LiveScript', 'LiveScript', ['ls']),
        new FileTypeInfo('text/x-lua', 'Lua', 'Lua', ['lua']),
        new FileTypeInfo('text/x-markdown', 'Markdown (GitHub-flavour)', 'Markdown (GitHub-flavour)', ['md', 'markdown']),
        new FileTypeInfo('text/x-mathematica', 'Mathematica', 'Mathematica', ['m', 'nb']),
        new FileTypeInfo('application/mbox', 'mbox', 'mbox', ['mbox']),
        new FileTypeInfo('text/x-mirc', 'mIRC', 'mIRC', ['mrc']),
        new FileTypeInfo('text/x-modelica', 'Modelica', 'Modelica', ['mo']),
        new FileTypeInfo('text/x-mscgen', 'MscGen', 'MscGen', ['msc']),
        new FileTypeInfo('text/x-mumps', 'MUMPS', 'MUMPS', ['m']),
        new FileTypeInfo('text/x-nginx-conf', 'Nginx', 'Nginx', ['conf']),
        new FileTypeInfo('text/x-nsis', 'NSIS', 'NSIS', ['nsi', 'nsh']),
        new FileTypeInfo('application/n-triples', 'N-Triples/N-Quads', 'N-Triples/N-Quads', ['nt', 'nq']),
        new FileTypeInfo('text/x-objectivec', 'Objective C', 'Objective C', ['m', 'mm']),
        new FileTypeInfo('text/x-ocaml', 'OCaml', 'OCaml', ['ml', 'mli']),
        new FileTypeInfo('text/x-octave', 'Octave (MATLAB)', 'Octave (MATLAB)', ['m']),
        new FileTypeInfo('text/x-oz', 'Oz', 'Oz', ['oz']),
        new FileTypeInfo('text/x-pascal', 'Pascal', 'Pascal', ['pas', 'p']),
        new FileTypeInfo('text/x-pegjs', 'PEG.js', 'PEG.js', ['pegjs']),
        new FileTypeInfo('text/x-perl', 'Perl', 'Perl', ['pl', 'pm', 'perl']),
        new FileTypeInfo('application/pgp-encrypted', 'PGP (ASCII armor)', 'PGP (ASCII armor)', ['asc', 'pgp']),
        new FileTypeInfo('application/x-httpd-php', 'PHP', 'PHP', ['php', 'php3', 'php4', 'php5', 'phtml']),
        new FileTypeInfo('text/x-pig', 'Pig Latin', 'Pig Latin', ['pig']),
        new FileTypeInfo('application/x-powershell', 'PowerShell', 'PowerShell', ['ps1', 'psd1', 'psm1']),
        new FileTypeInfo('text/x-properties', 'Properties files', 'Properties files', ['properties']),
        new FileTypeInfo('text/x-protobuf', 'ProtoBuf', 'ProtoBuf', ['proto']),
        new FileTypeInfo('text/x-pug', 'Pug', 'Pug', ['pug', 'jade']),
        new FileTypeInfo('text/x-puppet', 'Puppet', 'Puppet', ['pp']),
        new FileTypeInfo('text/x-python', 'Python', 'Python', ['py', 'pyw', 'py3']),
        new FileTypeInfo('text/x-q', 'Q', 'Q', ['q']),
        new FileTypeInfo('text/x-rsrc', 'R', 'R', ['r', 'R']),
        new FileTypeInfo('text/x-rpm-spec', 'RPM', 'RPM', ['spec']),
        new FileTypeInfo('text/x-rst', 'reStructuredText', 'reStructuredText', ['rst']),
        new FileTypeInfo('text/x-ruby', 'Ruby', 'Ruby', ['rb', 'rbw']),
        new FileTypeInfo('text/x-rustsrc', 'Rust', 'Rust', ['rs']),
        new FileTypeInfo('text/x-sas', 'SAS', 'SAS', ['sas']),
        new FileTypeInfo('text/x-sass', 'Sass', 'Sass', ['sass']),
        new FileTypeInfo('text/x-scala', 'Scala', 'Scala', ['scala', 'sc']),
        new FileTypeInfo('text/x-scheme', 'Scheme', 'Scheme', ['scm', 'ss']),
        new FileTypeInfo('text/x-scss', 'SCSS', 'SCSS', ['scss']),
        new FileTypeInfo('application/x-sh', 'Shell', 'Shell', ['sh', 'bash', 'zsh', 'fish']),
        new FileTypeInfo('text/x-sieve', 'Sieve', 'Sieve', ['siv']),
        new FileTypeInfo('text/x-slim', 'Slim', 'Slim', ['slim']),
        new FileTypeInfo('text/x-smalltalk', 'Smalltalk', 'Smalltalk', ['st']),
        new FileTypeInfo('text/x-smarty', 'Smarty', 'Smarty', ['tpl']),
        new FileTypeInfo('text/x-solr', 'Solr', 'Solr', ['solr']),
        new FileTypeInfo('text/x-soy', 'Soy', 'Soy', ['soy']),
        new FileTypeInfo('application/sparql-query', 'SPARQL', 'SPARQL', ['sparql']),
        new FileTypeInfo('text/x-sql', 'SQL (several dialects)', 'SQL (several dialects)', ['sql']),
        new FileTypeInfo('text/x-squirrel', 'Squirrel', 'Squirrel', ['nut']),
        new FileTypeInfo('text/x-latex', 'sTeX, LaTeX', 'sTeX, LaTeX', ['tex', 'sty']),
        new FileTypeInfo('text/x-stylus', 'Stylus', 'Stylus', ['styl']),
        new FileTypeInfo('text/x-swift', 'Swift', 'Swift', ['swift']),
        new FileTypeInfo('text/x-tcl', 'Tcl', 'Tcl', ['tcl']),
        new FileTypeInfo('text/x-textile', 'Textile', 'Textile', ['textile']),
        new FileTypeInfo('text/x-tiddlywiki', 'Tiddlywiki', 'Tiddlywiki', ['tid']),
        new FileTypeInfo('text/x-tiki', 'Tiki wiki', 'Tiki wiki', ['tiki']),
        new FileTypeInfo('text/x-toml', 'TOML', 'TOML', ['toml']),
        new FileTypeInfo('text/x-tornado', 'Tornado (templating language)', 'Tornado (templating language)', ['tornado']),
        new FileTypeInfo('text/troff', 'troff (for manpages)', 'troff (for manpages)', ['1', '2', '3', '4', '5', '6', '7', '8', '9']),
        new FileTypeInfo('text/x-ttcn', 'TTCN', 'TTCN', ['ttcn']),
        new FileTypeInfo('text/x-ttcn-cfg', 'TTCN Configuration', 'TTCN Configuration', ['cfg']),
        new FileTypeInfo('text/turtle', 'Turtle', 'Turtle', ['ttl']),
        new FileTypeInfo('text/x-twig', 'Twig', 'Twig', ['twig']),
        new FileTypeInfo('text/x-vb', 'VB.NET', 'VB.NET', ['vb']),
        new FileTypeInfo('text/x-vbscript', 'VBScript', 'VBScript', ['vbs']),
        new FileTypeInfo('text/velocity', 'Velocity', 'Velocity', ['vm']),
        new FileTypeInfo('text/x-verilog', 'Verilog/SystemVerilog', 'Verilog/SystemVerilog', ['v', 'vh', 'sv']),
        new FileTypeInfo('text/x-vhdl', 'VHDL', 'VHDL', ['vhdl', 'vhd']),
        new FileTypeInfo('text/x-vue', 'Vue.js app', 'Vue.js app', ['vue']),
        new FileTypeInfo('text/x-webidl', 'Web IDL', 'Web IDL', ['webidl']),
        new FileTypeInfo('text/x-wast', 'WebAssembly Text Format', 'WebAssembly Text Format', ['wast', 'wat']),
        new FileTypeInfo('application/xml', 'XML/HTML', 'XML/HTML', ['xml', 'html', 'htm', 'xhtml', 'xsl', 'svg']),
        new FileTypeInfo('application/xquery', 'XQuery', 'XQuery', ['xq', 'xquery']),
        new FileTypeInfo('text/x-yacas', 'Yacas', 'Yacas', ['ys']),
        new FileTypeInfo('text/yaml', 'YAML', 'YAML', ['yaml', 'yml']),
        new FileTypeInfo('text/x-yaml-frontmatter', 'YAML frontmatter', 'YAML frontmatter', ['md']),
        new FileTypeInfo('text/x-z80', 'Z80', 'Z80', ['z80']),
        new FileTypeInfo('application/json', 'JSON', 'JSON', ['json']),
        new FileTypeInfo('text/markdown', 'Markdown', 'Markdown', ['md', 'markdown'])
    ];

    static _fileTypesByMime = null;

    static getAllFileTypes() {
        if (!this._sorted) {
            this._fileTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));
            this._sorted = true;
        }
        return this._fileTypes;
    }

    static getFileTypeByMime(mimeType) {
        if (!this._fileTypesByMime) {
            this._fileTypesByMime = {};
            for (const ft of this._fileTypes) {
                if (ft.mimeType)
                    this._fileTypesByMime[ft.mimeType.toLowerCase()] = ft;
            }
        }
        if (!mimeType) return null;
        return this._fileTypesByMime[mimeType.toLowerCase()] || null;
    }

    static getMimeTypeForExtension(extension) {
        if (!extension) return null;
        extension = extension.toLowerCase();
        const fileTypes = FileTypes.getAllFileTypes();
        const fileType = fileTypes.find(ft => ft.fileExtensions.includes(extension));
        return fileType ? fileType.mimeType : null;
    }

    static getExtensionForMimeType(mimeType) {
        const fileType = FileTypes.getFileTypeByMime(mimeType);
        return fileType ? fileType.fileExtensions[0] : "txt";

    }

        // Canonical list of groups you want to show in the native file picker.
        // Order matters: first item becomes default ("All Files").
    static GROUP_DEFS = [
        { key: 'all', label: 'All Files', exts: ['*'] },

        // 1) Documents / plain text
        { key: 'text_docs', label: 'Text & Docs', exts: [
            'txt','text','log','md','markdown','rst','textile','nb','http'
        ]},

        // 2) Web surface (HTML/CSS/SVG/etc.)
        { key: 'web_frontend', label: 'Web / Front-End', exts: [
            'html','htm','xhtml','css','less','scss','sass','styl','svg','webidl'
        ]},

        // 3) JS/TS ecosystem (+ Vue)
        { key: 'js_ts', label: 'JavaScript / TypeScript', exts: [
            'js','mjs','jsx','ts','tsx','vue'
        ]},

        // 4) Server views & templates
        { key: 'templates', label: 'Templates & Web Views', exts: [
            'pug','jade','hbs','handlebars','twig','jinja2','j2','slim','haml','tornado','vm','jsp','aspx'
        ]},

        // 5) Data & markup formats
        { key: 'data_markup', label: 'Data & Markup', exts: [
            'csv','json','xml','xsl','yaml','yml','toml','dtd','xq','xquery','ttl','nt','nq'
        ]},

        // 6) Configurations & props
        { key: 'config_props', label: 'Config / Properties', exts: [
            'ini','properties','cfg','conf'
        ]},

        // 7) C / C++ / Obj-C (+ CMake)
        { key: 'c_cpp_objc', label: 'C / C++ / Objective-C / CMake', exts: [
            'c','h','cpp','cxx','cc','hpp','hh','hxx','m','mm','cmake','cmake.in','ino','idl'
        ]},

        // 8) Java & JVM languages
        { key: 'java_jvm', label: 'Java / Kotlin / Scala / Groovy', exts: [
            'java','kt','kts','scala','sc','groovy','gvy','gy','gsh'
        ]},

        // 9) .NET languages
        { key: 'dotnet', label: 'C# / VB.NET', exts: ['cs','vb'] },

        // 10) Python family
        { key: 'python_cython', label: 'Python / Cython', exts: [
            'py','pyw','py3','pyx','pxd','pxi'
        ]},

        // 11) Scripts (shell, Perl, PHP, Ruby, Lua, PowerShell, Coffee/Livescript)
        { key: 'scripting', label: 'Shell / Perl / PHP / Ruby / Lua', exts: [
            'sh','bash','zsh','fish','ps1','psd1','psm1','pl','pm','php','rb','rbw','lua','coffee','ls'
        ]},

        // 12) Functional / ML & friends
        { key: 'functional_ml', label: 'Functional / ML', exts: [
            'clj','cljs','cljc','edn','hs','lhs','elm','ex','exs','erl','hrl',
            'ml','mli','fs','fsi','fsx','fsscript','lisp','lsp','scm','ss',
            'hx','ceylon','cr','factor','fcl','fth','f','for','f90','f95','f03','f08','d','dylan','e','ecl'
        ]},

        // 13) Systems / low-level / HDL
        { key: 'systems_hw', label: 'Systems / Low-Level / HDL', exts: [
            'rs','go','swift','s','asm','v','vh','sv','vhdl','vhd','z80','wat','wast'
        ]},

        // 14) Scientific & math
        { key: 'scientific', label: 'Scientific & Math', exts: [
            'r','R','sas','mo','msc','ys'
        ]},

        // 15) Databases & query
        { key: 'database_query', label: 'SQL & Query', exts: [
            'sql','q','cypher','sparql','proto','pig','pp'
        ]},
    ];

    /**
     * Format a group label by adding up to 5 top extensions, e.g.:
     * "Python / Cython (.py, .pyw, .pyx, ...)"
     */
    static _labelWithSampleExts(label, exts) {
        if (!exts || !exts.length) return label;
        const visible = exts.slice(0, 5).map(e => '.' + e);
        const suffix = exts.length > 5 ? ', ...' : '';
        return `${label} (${visible.join(', ')}${suffix})`;
    }
    
        /**
     * Build a single picker "type" entry from a label + extension list.
     * Groups extensions under appropriate MIME types where possible.
     */
    static _buildPickerType(label, exts) {
        // Special case "All Files": use */* with empty extension list to let everything show.
        if (exts.length === 1 && exts[0] === '*') {
            return {
                description: label,
                accept: { '*/*': [] },
            };
        }

        // Group by mime for cleaner accept map
        const accept = {};
        const normalized = new Set(exts.filter(Boolean).map(e => e.replace(/^\./, '').toLowerCase()));
        for (const ext of normalized) {
            const mime = FileTypes.getMimeTypeForExtension(ext) || '*/*';
            if (!accept[mime]) accept[mime] = [];
            accept[mime].push('.' + ext);
        }

        // Deduplicate/clean
        for (const m in accept) {
            accept[m] = Array.from(new Set(accept[m]));
        }

        const labelWithExts = FileTypes._labelWithSampleExts(label, Array.from(normalized));
        return { description: labelWithExts, accept };
    }

    /**
     * Get the compact list of groups for the native picker.
     * Optionally pass an array of group keys to include in custom order.
     */
    static getPickerTypeGroups(includeKeys = null) {
        const defs = includeKeys
            ? this.GROUP_DEFS.filter(g => includeKeys.includes(g.key))
            : this.GROUP_DEFS;

        return defs.map(g => this._buildPickerType(g.label, g.exts));
    }

    /** Return the group key that contains a given extension (or null). */
    static _groupKeyForExt(ext) {
        if (!ext) return null;
        const clean = ext.replace(/^\./, '').toLowerCase();
        const hit = this.GROUP_DEFS.find(g => g.exts.includes(clean) || g.exts.includes('*'));
        return hit ? hit.key : null;
    }

    /**
     * Build picker types for Save As. If a preferred extension is provided,
     * put the matching group first so it becomes the default selection.
     * Otherwise, we keep the default order (All Files first).
     */
    static getPickerTypeGroupsForSave(preferredExt = null) {
        if (!preferredExt) return this.getPickerTypeGroups();

        const key = this._groupKeyForExt(preferredExt);
        if (!key) return this.getPickerTypeGroups();

        // Reorder: [matchingGroup, ...others (keeping relative order)]
        const defs = [...this.GROUP_DEFS];
        const idx = defs.findIndex(g => g.key === key);
        if (idx <= 0) return this.getPickerTypeGroups(); // already first or not found

        const reordered = [defs[idx], ...defs.slice(0, idx), ...defs.slice(idx + 1)];
        return reordered.map(g => this._buildPickerType(g.label, g.exts));
    }    
}