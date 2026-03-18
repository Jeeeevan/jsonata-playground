import * as vscode from 'vscode';
import * as jsonata from 'jsonata';
import * as fs from 'fs';
import * as path from 'path';

let playgroundPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('JSONata Playground activated!');

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('jsonata-playground-view', new SidebarProvider(context))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('jsonata-playground.open', () => {
			if (playgroundPanel) {
				playgroundPanel.reveal();
				return;
			}

			playgroundPanel = vscode.window.createWebviewPanel(
				'jsonataPlayground',
				'JSONata Playground',
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true }
			);

			playgroundPanel.onDidDispose(() => {
				playgroundPanel = undefined;
			});

			setupPlaygroundPanel(playgroundPanel);
		})
	);
}

class SidebarProvider implements vscode.WebviewViewProvider {
	constructor(private context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) {
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { 
			padding: 20px; 
			font-family: system-ui;
			color: var(--vscode-foreground);
		}
		.sidebar-container {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}
		button {
			padding: 10px 16px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
			font-weight: 500;
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		.icon { 
			margin-right: 8px;
		}
	</style>
</head>
<body>
	<div class="sidebar-container">
		<button id="newBtn"><span class="icon">✨</span> New Playground</button>
		<button id="openBtn"><span class="icon">📂</span> Open File</button>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		
		document.getElementById('newBtn').onclick = () => {
			vscode.postMessage({ command: 'newPlayground' });
		};
		
		document.getElementById('openBtn').onclick = () => {
			vscode.postMessage({ command: 'openFile' });
		};
	</script>
</body>
</html>`;

		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.command === 'newPlayground') {
				vscode.commands.executeCommand('jsonata-playground.open');
			} else if (message.command === 'openFile') {
				const files = await vscode.window.showOpenDialog({
					canSelectMany: false,
					filters: { 'JSONata': ['jsonata'], 'Text': ['txt'], 'All': ['*'] }
				});
				if (files && files[0]) {
					const content = fs.readFileSync(files[0].fsPath, 'utf8');
					vscode.commands.executeCommand('jsonata-playground.open');
					setTimeout(() => {
						if (playgroundPanel) {
							playgroundPanel.webview.postMessage({
								command: 'loadFile',
								content: content,
								fileName: path.basename(files[0].fsPath)
							});
						}
					}, 100);
				}
			}
		});
	}
}

function setupPlaygroundPanel(panel: vscode.WebviewPanel) {
	panel.webview.options = { enableScripts: true };
	panel.webview.html = getPlaygroundHTML();

	panel.webview.onDidReceiveMessage(async (message: any) => {
		if (message.command === 'evaluate') {
			try {
				const expr = jsonata.default(message.jsonata);
				const result = await expr.evaluate(JSON.parse(message.json));
				panel.webview.postMessage({
					command: 'updateOutput',
					result: JSON.stringify(result, null, 2),
					error: null
				});
			} catch (error) {
				let errorMessage = '';
				if (error instanceof Error) {
					errorMessage = error.message;
				} else if (typeof error === 'string') {
					errorMessage = error;
				} else if (error && typeof error === 'object' && 'message' in error) {
					errorMessage = String((error as any).message);
				} else {
					errorMessage = JSON.stringify(error);
				}
				const errorLine = extractLineNumber(errorMessage);
				panel.webview.postMessage({
					command: 'updateOutput',
					result: null,
					error: errorMessage,
					errorLine: errorLine
				});
			}
		} else if (message.command === 'saveFile') {
			const uri = await vscode.window.showSaveDialog({
				filters: { 'JSONata': ['jsonata'], 'Text': ['txt'], 'All': ['*'] }
			});
			if (uri) {
				fs.writeFileSync(uri.fsPath, message.content, 'utf8');
				vscode.window.showInformationMessage('File saved!');
			}
		}
	});
}

function extractLineNumber(error: string): number | null {
	const match = error.match(/line (\d+)/i);
	return match ? parseInt(match[1]) - 1 : null;
}

function getPlaygroundHTML(): string {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		html, body { height: 100%; }
		body { 
			font-family: system-ui; 
			background: var(--vscode-editor-background); 
			color: var(--vscode-editor-foreground);
			display: flex;
			flex-direction: column;
			height: 100vh;
		}
		.header {
			padding: 12px 16px;
			background: var(--vscode-titleBar-activeBackground);
			display: flex;
			justify-content: space-between;
			align-items: center;
			flex-shrink: 0;
		}
		.title {
			font-weight: 600;
			font-size: 14px;
		}
		.toolbar {
			display: flex;
			gap: 8px;
		}
		.layout-btn {
			padding: 4px 8px;
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: 1px solid var(--vscode-button-border);
			border-radius: 3px;
			cursor: pointer;
			font-size: 11px;
		}
		.layout-btn.active {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		.layout-btn:hover {
			background: var(--vscode-button-hoverBackground);
		}
		.editor-group {
			display: flex;
			flex: 1;
			overflow: hidden;
			gap: 0;
		}
		.panel {
			display: flex;
			flex-direction: column;
			flex: 1;
			border: 1px solid var(--vscode-editorGroup-border);
			overflow: hidden;
		}
		.panel-header {
			padding: 8px 12px;
			background: var(--vscode-editorGroupHeader-tabsBackground);
			border-bottom: 1px solid var(--vscode-editorGroup-border);
			font-size: 12px;
			font-weight: 600;
			display: flex;
			justify-content: space-between;
			align-items: center;
			flex-shrink: 0;
		}
		.panel-content {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			position: relative;
		}
		textarea {
			flex: 1;
			padding: 12px;
			background: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
			border: none;
			font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
			font-size: 13px;
			line-height: 1.5;
			resize: none;
		}
		.output-area {
			flex: 1;
			padding: 12px;
			overflow: auto;
			white-space: pre-wrap;
			font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
			font-size: 13px;
			line-height: 1.5;
			background: var(--vscode-editor-background);
		}
		.output-area.error {
			background: rgba(200, 40, 40, 0.08);
		}
		.status-bar {
			padding: 6px 12px;
			border-top: 1px solid var(--vscode-editorGroup-border);
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			flex-shrink: 0;
		}
		.header-btn {
			padding: 2px 6px;
			background: transparent;
			color: inherit;
			border: none;
			cursor: pointer;
			font-size: 11px;
			margin-left: 6px;
		}
		.header-btn:hover {
			background: var(--vscode-button-hoverBackground);
			border-radius: 3px;
		}
		.resizer {
			flex-shrink: 0;
			background: var(--vscode-editorGroup-border);
			z-index: 10;
		}
		.resizer.h {
			width: 2px;
			cursor: col-resize;
		}
		.resizer.v {
			height: 2px;
			cursor: row-resize;
		}
		.error-line {
			position: absolute;
			left: 0;
			width: 100%;
			height: 1.5em;
			background: rgba(255, 0, 0, 0.12);
			border-left: 3px solid #f48771;
			display: none;
			pointer-events: none;
		}
	</style>
</head>
<body>
	<div class="header">
		<span class="title">🚀 JSONata Playground</span>
		<div class="toolbar">
			<button class="layout-btn active" data-layout="3col" title="3-Column Layout">≡ ≡ ≡</button>
			<button class="layout-btn" data-layout="2col" title="2-Column Layout">≡≡ ≡</button>
		</div>
	</div>

	<div class="editor-group" id="root">
		<div class="panel" id="p1">
			<div class="panel-header">📄 JSON Input</div>
			<div class="panel-content">
				<textarea id="json" spellcheck="false">{"name":"John","age":30,"active":true}</textarea>
			</div>
		</div>

		<div class="resizer h" id="r-h"></div>

		<div class="editor-group" id="right">
			<div class="panel" id="p2">
				<div class="panel-header">
					 JSONata
					<div>
						<button class="header-btn" id="open" title="Open">📂</button>
						<button class="header-btn" id="save" title="Save">💾</button>
					</div>
				</div>
				<div class="panel-content">
					<div class="error-line" id="errLine"></div>
					<textarea id="expr" spellcheck="false">$.*</textarea>
				</div>
			</div>

			<div class="resizer v" id="r-v"></div>

			<div class="panel" id="p3">
				<div class="panel-header">Output</div>
				<div class="panel-content">
					<div class="output-area" id="output"></div>
					<div class="status-bar"><span id="status">Ready</span></div>
				</div>
			</div>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const json = document.getElementById('json');
		const expr = document.getElementById('expr');
		const output = document.getElementById('output');
		const status = document.getElementById('status');
		const errLine = document.getElementById('errLine');
		
		const p1 = document.getElementById('p1');
		const p2 = document.getElementById('p2');
		const p3 = document.getElementById('p3');
		const root = document.getElementById('root');
		const right = document.getElementById('right');
		const rh = document.getElementById('r-h');
		const rv = document.getElementById('r-v');

		let isDraggingH = false;
		let isDraggingV = false;
		let layout = '3col';

		function evaluate() {
			const jsonStr = json.value.trim();
			const exprStr = expr.value.trim();
			if (!jsonStr || !exprStr) return;
			
			status.textContent = 'Evaluating...';
			vscode.postMessage({ command: 'evaluate', json: jsonStr, jsonata: exprStr });
		}

		function setLayout(mode) {
			if (mode === '3col') {
				right.style.flexDirection = 'row';
				rv.style.display = 'block';
			} else if (mode === '2col') {
				right.style.flexDirection = 'column';
				rv.style.display = 'block';
			}
			layout = mode;
		}

		rh.addEventListener('mousedown', (e) => {
			isDraggingH = true;
			document.body.style.cursor = 'col-resize';
			e.preventDefault();
		});

		rv.addEventListener('mousedown', (e) => {
			isDraggingV = true;
			document.body.style.cursor = 'row-resize';
			e.preventDefault();
		});

		document.addEventListener('mousemove', (e) => {
			if (isDraggingH) {
				const rect = root.getBoundingClientRect();
				const newP1Flex = (e.clientX - rect.left) / rect.width;
				p1.style.flex = Math.max(0.2, Math.min(0.8, newP1Flex));
				right.style.flex = Math.max(0.2, Math.min(0.8, 1 - newP1Flex));
			}
			if (isDraggingV) {
				const rect = right.getBoundingClientRect();
				const newP2Flex = (e.clientY - rect.top) / rect.height;
				p2.style.flex = Math.max(0.2, Math.min(0.8, newP2Flex));
				p3.style.flex = Math.max(0.2, Math.min(0.8, 1 - newP2Flex));
			}
		});

		document.addEventListener('mouseup', () => {
			isDraggingH = false;
			isDraggingV = false;
			document.body.style.cursor = 'default';
		});

		document.getElementById('open').onclick = () => vscode.postMessage({ command: 'openFile' });
		document.getElementById('save').onclick = () => vscode.postMessage({ command: 'saveFile', content: expr.value });

		document.querySelectorAll('.layout-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
				e.target.classList.add('active');
				setLayout(e.target.dataset.layout);
			});
		});

		json.addEventListener('input', () => {
			clearTimeout(window.evalTimer);
			window.evalTimer = setTimeout(evaluate, 300);
		});

		expr.addEventListener('input', () => {
			clearTimeout(window.evalTimer);
			window.evalTimer = setTimeout(evaluate, 300);
		});

		window.addEventListener('message', (e) => {
			const msg = e.data;
			if (msg.command === 'updateOutput') {
				if (msg.error) {
					output.innerHTML = '';
					output.textContent = msg.error;
					output.className = 'output-area error';
					status.textContent = '❌ Error';
					if (msg.errorLine !== null && msg.errorLine >= 0) {
						const lineHeight = parseFloat(getComputedStyle(expr).lineHeight);
						errLine.style.top = (msg.errorLine * lineHeight) + 'px';
						errLine.style.display = 'block';
					}
				} else {
					output.innerHTML = '';
					output.textContent = msg.result || '';
					output.className = 'output-area';
					errLine.style.display = 'none';
					status.textContent = '✓ Ready';
				}
			} else if (msg.command === 'loadFile') {
				expr.value = msg.content;
				evaluate();
			}
		});

		evaluate();
	</script>
</body>
</html>`;
}

export function deactivate() {}
