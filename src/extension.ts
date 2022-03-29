import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// callback for dartfileutils.createTest
	let createTest = vscode.commands.registerCommand('dartfileutils.createTest', async (uri: vscode.Uri) => {
		const relativePath = determineRelativeTestPath(uri);
		if (typeof relativePath === 'undefined') {
			return;
		}
		const absolutePath = determineAbsoluteTestPath(relativePath);

		// create file if it does not already exist
		if (!(await fileExists(absolutePath))) {
			const wsEdit = new vscode.WorkspaceEdit();
			wsEdit.createFile(absolutePath, { ignoreIfExists: true });
			wsEdit.insert(absolutePath, new vscode.Position(0, 0), 'void main() {\n\t/// TODO add test content\n}');
			vscode.workspace.applyEdit(wsEdit).then(() => vscode.workspace.openTextDocument(absolutePath)).then((document) => {
				document.save();
				vscode.window.showTextDocument(document, 0, false);
			});
			vscode.window.showInformationMessage('Created ' + relativePath);
		} else {
			console.warn('dartfileutils.createTest: File ' + relativePath + ' already exists!');
			vscode.window.showWarningMessage('File ' + relativePath + ' already exists!');
		}
	});

	// callback for dartfileutils.openTest
	let openTest = vscode.commands.registerCommand('dartfileutils.openTest', async (uri: vscode.Uri) => {
		const relativePath = determineRelativeTestPath(uri);
		if (typeof relativePath === 'undefined') {
			return;
		}
		const absolutePath = determineAbsoluteTestPath(relativePath);

		// create file if it does not already exist
		if ((await fileExists(absolutePath))) {
			vscode.workspace.openTextDocument(absolutePath).then((document) => {
				vscode.window.showTextDocument(document, 0, false);
			});
		} else {
			console.warn('dartfileutils.openTest: File ' + relativePath + ' does not exists!');
			vscode.window.showWarningMessage('File ' + relativePath + ' does not exists!');
		}
	});

	// determines the relative file path for a class in test folder using a uri from lib
	let determineRelativeTestPath = function (uri: vscode.Uri): string | undefined {
		// if no uri given (i.e. not triggered from context menu), set uri as active file (when file is a dart file)
		if (typeof uri === 'undefined') {
			if (vscode.window.activeTextEditor) {
				const activeDocumentUri = vscode.window.activeTextEditor.document.uri;
				if (activeDocumentUri.path.endsWith('.dart')) {
					uri = activeDocumentUri;
				} else {
					console.error('dartfileutils.createTest: ' + activeDocumentUri.path + ' is not a dart file');
					vscode.window.showErrorMessage(activeDocumentUri.path + ' is not a dart file');
					return;
				}
			}
		}

		// if there is no active file nor triggered from context menu, output error
		if (!uri) {
			console.error('dartfileutils.createTest: No selected file to create a test for.');
			vscode.window.showErrorMessage('No selected file to create a test for.');
			return;
		}

		// determine input path as relative to workspace
		var inputRelativePath = vscode.workspace.asRelativePath(uri);
		inputRelativePath = inputRelativePath.replace('/\\/g', '/');

		// convert part paths
		const partTypes = ['part', 'g', 'freezed'];
		for (let part of partTypes) {
			inputRelativePath = replacePart(inputRelativePath, part);
		}

		// determine relative path
		// TODO test on windows, linux
		var outputRelativePath = null;
		if (inputRelativePath.startsWith('lib/')) {
			outputRelativePath = 'test/' + inputRelativePath.substring(4, inputRelativePath.length - 5) + '_test.dart';
		} else if (inputRelativePath.startsWith('lib/src/')) {
			outputRelativePath = 'test/' + inputRelativePath.substring(8, inputRelativePath.length - 5) + '_test.dart';
		}

		// log an error if path is invalid
		if (outputRelativePath == null) {
			console.error('dartfileutils.createTest: ' + inputRelativePath + ' is not a valid dart file to create a test for. Expected file in lib.');
			vscode.window.showErrorMessage(inputRelativePath + ' is not a valid dart file to create a test for. Expected file in lib.');
			return;
		}

		return outputRelativePath;
	}

	// determines the absolute file path for a relative path
	let determineAbsoluteTestPath = function (relativePath: string): vscode.Uri {
		// TODO test on windows, linux
		const wsPath = vscode.workspace.workspaceFolders![0]!.uri.fsPath;
		const outputAbsolutePath = vscode.Uri.file(wsPath + '/' + relativePath);

		return outputAbsolutePath;
	}

	// determines if a file exists without needing to open it
	let fileExists = async function (path: vscode.Uri): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(path);
			return true;
		} catch {
			return false;
		}
	}

	let replacePart = function (path: string, part: string): string {
		const pathExtension = `${part}.dart`;
		if (path.endsWith(pathExtension)) {
			const initialPath = path;
			path = path.replace(pathExtension, '.dart');
			console.debug(`dartfileutils.createTest: ${initialPath} is a part file. Converted to ${path}.`);
		}
		return path;
	}

	context.subscriptions.push(createTest);
	context.subscriptions.push(openTest);
}

export function deactivate() { }
