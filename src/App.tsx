import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { CodeEditor } from "./components/CodeEditor";
import { TokenOutput } from "./components/TokenOutput";
import { ASTOutput } from "./components/ASTOutput";
import { Button } from "./components/ui/button";
import { ModeToggle } from "./components/mode-toggle";
import { Play } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

interface CompileResult {
  tokens: Token[];
  ast: any | null;
  error?: string | null;
}

export default function App() {
  const [code, setCode] = useState(`// Código de Exemplo em C++
#include <iostream>
using namespace std;

int main() {
    int n1 = 67;

    cout << "Hello, World!";

    return 0;
}`);
  
  const [tokens, setTokens] = useState<Token[]>([]);
  const [ast, setAst] = useState<any>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  async function handleCompile() {
    setIsCompiling(true);
    
    // Limpa o estado anterior para evitar confusão visual
    setTokens([]);
    setAst(null);

    const loadingToast = toast.loading("Compilamento iniciado...");

    try {
      // Chama o backend Rust
      const result = await invoke<CompileResult>("compile", { code });
      
      // Sempre atualiza os tokens, mesmo se houver erro de sintaxe
      setTokens(result.tokens);

      if (result.error) {
        // Se houver erro de lógica (parser), mostra alerta mas mantém os tokens visíveis
        toast.dismiss(loadingToast);
        //alert(result.error);
        toast.error("Erro de Compilação", {
          description: result.error,
          duration: 5000,
        });
      } else {
        // Sucesso total
        toast.dismiss(loadingToast);
        setAst(result.ast);
        toast.success("Compilação Concluída!", {
          description: "Análise léxica e sintática finalizadas com sucesso.",
          duration: 5000,
        });
      }

    } catch (error) {
      // Erros fatais (Rust panic não tratado ou falha de comunicação)
      console.error(error);
      toast.dismiss(loadingToast);
      //alert("Erro crítico ao compilar: " + error);
      toast.error("Erro Crítico", {
        description: "Falha na comunicação com o compilador: " + error,
      });
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    
    <div className="h-screen flex flex-col bg-background text-foreground">
      
      {/* Cabeçalho */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-card">
        <div>
          <h1 className="text-lg font-bold">Compilador C++ (Rust + Tauri)</h1>
          <p className="text-sm text-muted-foreground">Análise Léxica e Sintática</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Adicione o Botão de Tema aqui */}
          <ModeToggle />
          
          <Button onClick={handleCompile} disabled={isCompiling} className="gap-2">
            <Play className="size-4" />
            {isCompiling ? "Compilando..." : "Compilar"}
          </Button>
        </div>
      </header>

      {/* Toasts */}
      <Toaster />

      {/* Área de Conteúdo com Abas */}
      <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 mt-4">
          <TabsList className="w-fit">
            <TabsTrigger value="editor">Editor de Código</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="ast">AST (Sintático)</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="editor" className="h-full m-0 p-6 pt-2">
            <CodeEditor code={code} onChange={setCode} />
          </TabsContent>

          <TabsContent value="tokens" className="h-full m-0 p-6 pt-2 overflow-auto">
            <TokenOutput tokens={tokens} />
          </TabsContent>

          <TabsContent value="ast" className="h-full m-0 p-6 pt-2 overflow-auto">
            <ASTOutput ast={ast} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}