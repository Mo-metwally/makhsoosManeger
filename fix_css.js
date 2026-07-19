const fs = require('fs');
const cssPath = 'client/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');

const regex = /\/\* Global Modal Styles \*\/[\s\S]*?(?=\.modal-header h2 {)/;

const fixedStyles = `/* Global Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: overlayFadeIn 0.3s ease;
}

@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: #0f172a;
  border: 1px solid var(--border-color);
  border-top: 2px solid var(--theme-color);
  width: 90%;
  max-width: 1100px;
  border-radius: 24px;
  padding: 2.5rem;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8), 0 0 50px var(--theme-glow), inset 0 1px 20px rgba(255, 255, 255, 0.03);
  animation: modalScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

`;

css = css.replace(regex, fixedStyles);
fs.writeFileSync(cssPath, css);
console.log('Done replacing CSS');
