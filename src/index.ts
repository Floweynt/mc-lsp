import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    Diagnostic,
    TextDocumentPositionParams,
    CompletionItem
} from "vscode-languageserver/node";
import {TextDocument} from "vscode-languageserver-textdocument";
import {SEMANTIC_TOKEN_NAMES} from "./sem";
import {Config} from "./config";
import {FileManager} from "./fileman";

interface LSPSettings {
    maxNumberOfProblems: number;
}

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const config = new Config();
const fileManager = new FileManager(config);

const defaultSettings: LSPSettings = {maxNumberOfProblems: 1000,};
let globalSettings: LSPSettings = defaultSettings;
const documentSettings: Map<string, Thenable<LSPSettings>> = new Map();
let hasConfigurationCapability = false;

// event handles
connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    hasConfigurationCapability = !!capabilities.workspace?.configuration;
    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
            },
            semanticTokensProvider: {
                full: true,
                legend: {
                    tokenTypes: SEMANTIC_TOKEN_NAMES,
                    tokenModifiers: [],
                },
            },
        },
    };

    let path = ".";
    if (params.rootPath) {
        path = params.rootPath;
    }

    config.load(path);

    return result;
});

connection.onInitialized(async () => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        documentSettings.clear();
        fileManager.clear();
    } else {
        globalSettings = <LSPSettings>(
            (change.settings.languageServerExample || defaultSettings)
        );
    }

    documents.all().forEach(doUpdateFile);
});

documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
    doUpdateFile(change.document);
});

async function doUpdateFile(doc: TextDocument) {
    fileManager.updateFile(doc.uri, doc.getText());
    await connection.sendDiagnostics({
        uri: doc.uri,
        diagnostics: fileManager.getInfo(doc.uri)?.diagnostics as Diagnostic[],
    });
}

connection.onRequest("textDocument/semanticTokens/full", (params) => {
    return {
        data: fileManager.getInfo(params.textDocument.uri)?.semanticToken,
    };
});

connection.onCompletion(
    (docPos: TextDocumentPositionParams): CompletionItem[] => {
        return fileManager.doAutocomplete(docPos) ?? [];
    }
);
/*
// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data === 1) {
            item.detail = 'TypeScript details';
            item.documentation = 'TypeScript documentation';
        } else if (item.data === 2) {
            item.detail = 'JavaScript details';
            item.documentation = 'JavaScript documentation';
        }
        return item;
    }
);*/

documents.listen(connection);
connection.listen();
