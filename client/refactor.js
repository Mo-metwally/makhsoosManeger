import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const srcDir = path.resolve('src');

// Function to convert camelCase to kebab-case
function toKebabCase(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

// Function to recursively find all files
function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        } else {
            filelist.push(filepath);
        }
    }
    return filelist;
}

const allFiles = walkSync(srcDir);

// 1. Rename all .css to .scss
console.log('Renaming .css to .scss...');
allFiles.forEach(file => {
    if (file.endsWith('.css')) {
        const newName = file.replace(/\.css$/, '.scss');
        fs.renameSync(file, newName);
        console.log(`Renamed: ${path.basename(file)} -> ${path.basename(newName)}`);
    }
});

// Re-read file list after renaming
const filesAfterRename = walkSync(srcDir);
const jsxFiles = filesAfterRename.filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

// 2. Process JSX files
console.log('\nProcessing JSX files...');
for (const file of jsxFiles) {
    const code = fs.readFileSync(file, 'utf-8');
    let ast;
    try {
        ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx']
        });
    } catch (e) {
        console.error(`Error parsing ${file}:`, e.message);
        continue;
    }

    const replacements = [];
    let scssBuffer = '';
    let classCounter = 1;
    const componentName = path.basename(file, path.extname(file));
    let hasCssImport = false;
    let cssImportPath = '';

    // First pass: find imports
    traverse(ast, {
        ImportDeclaration(pathNode) {
            const source = pathNode.node.source.value;
            if (source.endsWith('.css')) {
                hasCssImport = true;
                cssImportPath = source.replace(/\.css$/, '.scss');
                replacements.push({
                    start: pathNode.node.source.start,
                    end: pathNode.node.source.end,
                    text: `"${cssImportPath}"`
                });
            } else if (source.endsWith('.scss')) {
                hasCssImport = true;
                cssImportPath = source;
            }
        }
    });

    // Second pass: find style attributes
    traverse(ast, {
        JSXAttribute(pathNode) {
            if (pathNode.node.name.name === 'style' && pathNode.node.value && pathNode.node.value.type === 'JSXExpressionContainer') {
                const expr = pathNode.node.value.expression;
                if (expr.type === 'ObjectExpression') {
                    let isFullyStatic = true;
                    const cssProps = [];

                    for (const prop of expr.properties) {
                        if (prop.type !== 'ObjectProperty') {
                            isFullyStatic = false;
                            break;
                        }
                        
                        let keyName = '';
                        if (prop.key.type === 'Identifier') keyName = prop.key.name;
                        else if (prop.key.type === 'StringLiteral') keyName = prop.key.value;
                        else {
                            isFullyStatic = false;
                            break;
                        }

                        let valStr = '';
                        if (prop.value.type === 'StringLiteral') {
                            valStr = prop.value.value;
                        } else if (prop.value.type === 'NumericLiteral') {
                            valStr = prop.value.value;
                            // Add px to numeric values unless they are unitless CSS properties like opacity, zIndex, etc.
                            const unitlessProps = ['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order'];
                            if (!unitlessProps.includes(keyName) && valStr !== 0) {
                                valStr += 'px';
                            }
                        } else {
                            isFullyStatic = false;
                            break;
                        }

                        cssProps.push(`  ${toKebabCase(keyName)}: ${valStr};`);
                    }

                    if (isFullyStatic && cssProps.length > 0) {
                        const className = `${componentName.toLowerCase()}-style-${classCounter++}`;
                        
                        scssBuffer += `.${className} {\n${cssProps.join('\n')}\n}\n\n`;

                        // We replace the whole style={{...}} attribute with className="..."
                        // But we have to be careful if className already exists on this element!
                        // This script does a simple replacement. If a className already exists, React might complain if we have two className props.
                        // We will check the parent JSXOpeningElement for an existing className attribute.
                        
                        const parentEl = pathNode.parentPath.node;
                        const existingClassNameAttr = parentEl.attributes.find(attr => attr.type === 'JSXAttribute' && attr.name.name === 'className');
                        
                        if (existingClassNameAttr) {
                            // Complex: we need to merge the class into the existing className.
                            // If the existing is a StringLiteral: className="foo"
                            if (existingClassNameAttr.value.type === 'StringLiteral') {
                                const oldVal = existingClassNameAttr.value.value;
                                replacements.push({
                                    start: existingClassNameAttr.value.start,
                                    end: existingClassNameAttr.value.end,
                                    text: `"${oldVal} ${className}"`
                                });
                                // Remove the style attribute completely
                                replacements.push({
                                    start: pathNode.node.start,
                                    end: pathNode.node.end,
                                    text: ''
                                });
                            } else if (existingClassNameAttr.value.type === 'JSXExpressionContainer') {
                                // If it's className={\`foo \${bar}\`}
                                // Too complex for string replace on existing attribute easily without knowing its shape.
                                // Let's skip it and treat it as dynamic for safety.
                                isFullyStatic = false;
                            }
                        } else {
                            // Safe to replace style with className
                            replacements.push({
                                start: pathNode.node.start,
                                end: pathNode.node.end,
                                text: `className="${className}"`
                            });
                        }
                    }
                }
            }
        }
    });

    if (replacements.length > 0) {
        // Sort descending by start to avoid shifting indices
        replacements.sort((a, b) => b.start - a.start);
        
        let newCode = code;
        for (const repl of replacements) {
            newCode = newCode.slice(0, repl.start) + repl.text + newCode.slice(repl.end);
        }

        // Prepend SCSS import if we generated classes but there's no import
        if (scssBuffer.length > 0 && !hasCssImport) {
            const scssFileName = `${componentName}.scss`;
            newCode = `import './${scssFileName}';\n` + newCode;
            cssImportPath = `./${scssFileName}`;
        }

        fs.writeFileSync(file, newCode, 'utf-8');
        console.log(`Updated ${path.basename(file)}`);

        if (scssBuffer.length > 0) {
            const targetScssFile = cssImportPath ? path.resolve(path.dirname(file), cssImportPath) : path.resolve(path.dirname(file), `${componentName}.scss`);
            fs.appendFileSync(targetScssFile, scssBuffer, 'utf-8');
            console.log(`Added ${classCounter - 1} classes to ${path.basename(targetScssFile)}`);
        }
    }
}

console.log('Done!');
