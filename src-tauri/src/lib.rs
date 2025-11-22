// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use serde::Serialize;
use CompiladorRustC::{Lexer, Parser, Stmt, Token};

#[derive(Serialize)]
struct CompilerOutput {
    tokens: Vec<Token>,
    ast: Option<Vec<Stmt>>,
    error: Option<String>,   
}

#[tauri::command]
fn compile(code: String) -> Result<CompilerOutput, String> {
    // executamos o Lexer isoladamente. Se der panic aqui, é um erro fatal.
    let lexer_result = std::panic::catch_unwind(|| {
        let mut lexer = Lexer::new(code);
        let mut tokens: Vec<Token> = Vec::new();

        loop {
            let token = lexer.prox_token();
            let is_fundo = matches!(token, Token::Fundo);
            
            tokens.push(token);

            if is_fundo {
                break;
            }
        }
        tokens
    });

    // se o Lexer falhar, retornamos erro de sistema (Promise reject no frontend)
    let tokens = match lexer_result {
        Ok(t) => t,
        Err(_) => return Err("Erro fatal durante a análise léxica.".to_string()),
    };

    // clonamos tokens para o parser, mantendo a cópia original para retorno
    let tokens_for_parser = tokens.clone();
    
    let parser_result = std::panic::catch_unwind(|| {
        let mut parser = Parser::new(tokens_for_parser);
        parser.parse()
    });

    // Construímos a resposta baseada no sucesso ou falha do Parser
    match parser_result {
        Ok(ast) => Ok(CompilerOutput {
            tokens,
            ast: Some(ast),
            error: None,
        }),
        Err(e) => {
            // recupera a mensagem de erro do panic
            let msg = if let Some(m) = e.downcast_ref::<&str>() {
                format!("Erro de Sintaxe: {}", m)
            } else if let Some(m) = e.downcast_ref::<String>() {
                format!("Erro de Sintaxe: {}", m)
            } else {
                "Erro de compilação desconhecido.".to_string()
            };

            // retorna os tokens com o erro (Promise resolve no frontend, mas com flag de erro)
            Ok(CompilerOutput {
                tokens,
                ast: None,
                error: Some(msg),
            })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![compile])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}