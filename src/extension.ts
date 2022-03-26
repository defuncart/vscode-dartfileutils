import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// callback for dartfileutils.createTest
	let disposable = vscode.commands.registerCommand('dartfileutils.createTest', async (uri: vscode.Uri) => {
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

		// ignore part files
		if (inputRelativePath.endsWith('.part.dart') || inputRelativePath.endsWith('.g.dart') || inputRelativePath.endsWith('.freezed.dart')) {
			console.warn('dartfileutils.createTest: ' + inputRelativePath + ' is a part file. Ignoring.');
			vscode.window.showWarningMessage(inputRelativePath + ' is a part file. Ignoring.');
			return;
		}

		// determine relative output path
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

		// determine absolute output path
		const wsEdit = new vscode.WorkspaceEdit();
		const wsPath = vscode.workspace.workspaceFolders![0]!.uri.fsPath;
		const outputAbsolutePath = vscode.Uri.file(wsPath + '/' + outputRelativePath);

		// create file if it does not already exist
		if (!(await fileExists(outputAbsolutePath))) {
			wsEdit.createFile(outputAbsolutePath, { ignoreIfExists: true });
			wsEdit.insert(outputAbsolutePath, new vscode.Position(0, 0), 'void main() {\n\t/// TODO add test content\n}');
			vscode.workspace.applyEdit(wsEdit).then(() => vscode.workspace.openTextDocument(outputAbsolutePath)).then((document) => {
				document.save();
				vscode.window.showTextDocument(document, 0, false);
			});
			vscode.window.showInformationMessage('Created ' + outputRelativePath);
		} else {
			console.warn('dartfileutils.createTest: File ' + outputRelativePath + ' already exists!');
			vscode.window.showWarningMessage('File ' + outputRelativePath + ' already exists!');
		}
	});

	// determines if a file exists without needing to open it
	let fileExists = async function (path: vscode.Uri): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(path);
			return true;
		} catch {
			return false;
		}
	}

	context.subscriptions.push(disposable);
}

export function deactivate() { }
