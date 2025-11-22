import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface ASTOutputProps {
  ast: any;
}

interface ASTNodeProps {
  node: any;
  label?: string;
  depth?: number;
}

function ASTNode({ node, label, depth = 0 }: ASTNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 3);

  // 1. Tratamento de Nulo
  if (node === null) {
      return (
        <div className="py-1" style={{ marginLeft: `${depth * 12}px` }}>
            {label && <span className="text-muted-foreground mr-2 text-xs">{label}:</span>}
            <span className="text-muted-foreground italic text-xs">null</span>
        </div>
      );
  }
  
  // 2. Tratamento de Primitivos (Strings, Numbers)
  if (typeof node !== "object") {
    return (
        <div className="py-1 flex items-center gap-2" style={{ marginLeft: `${depth * 12}px` }}>
            {label && <span className="text-muted-foreground text-xs">{label}:</span>}
            {typeof node === 'string' && /^[A-Z]/.test(node) ? (
                 <Badge variant="outline" className="text-orange-600 border-orange-500/30 bg-orange-500/5 font-mono text-[10px]">
                    {node}
                 </Badge>
            ) : (
                 <span className="text-orange-500 font-mono text-sm">"{String(node)}"</span>
            )}
        </div>
    );
  }

  // 3. Lógica para diferenciar Enum (Wrapper) de Struct (Objeto Plano)
  const keys = Object.keys(node);
  
  // Se tiver mais de 1 chave, é certeza que é uma Struct (como Parametro {tipo, nome...})
  // Se tiver 1 chave, pode ser um Enum OU uma Struct com 1 campo. 
  const isEnumWrapper = keys.length === 1 && /^[A-Z]/.test(keys[0]);

  let nodeLabel = "";
  let properties: [string, any][] = [];
  let isStruct = false;

  if (isEnumWrapper) {
      // É um Enum (ex: Stmt::If), usamos a chave como Badge
      nodeLabel = keys[0];
      const data = node[nodeLabel];
      if (typeof data === 'object' && data !== null) {
          properties = Object.entries(data);
      } else if (data !== null) {
          // Caso especial para Enums que guardam valor primitivo direto
           properties = [['value', data]]; 
      }
  } else {
      // É uma Struct (ex: Parametro), não tem Badge principal, listamos as chaves direto
      isStruct = true;
      properties = Object.entries(node);
  }

  const hasChildren = properties.length > 0;

  return (
    <div className="select-none text-sm font-mono">
      <div
        className={`flex items-start gap-2 py-1 hover:bg-muted/50 rounded px-2 transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
            e.stopPropagation();
            if(hasChildren) setIsExpanded(!isExpanded)
        }}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        {/* Ícone de Expansão */}
        <div className="mt-0.5 text-muted-foreground shrink-0">
            {hasChildren ? (
                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : <span className="w-[14px] inline-block"/>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Label da propriedade pai (ex: "parametros:") */}
          {label && <span className="text-muted-foreground italic text-xs">{label}:</span>}
          
          {/* Se for Enum, mostra o Badge. Se for Struct, mostra apenas "{}" indicativo ou nada */}
          {!isStruct && nodeLabel && (
             <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">
                {nodeLabel}
             </Badge>
          )}
          
          {/* Valor primitivo direto de enum unitário */}
          {!isStruct && properties.length === 1 && properties[0][0] === 'value' && (
              <span className="text-green-600 font-bold bg-green-500/5 px-1 rounded">{String(properties[0][1])}</span>
          )}
        </div>
      </div>

      {/* Renderização dos Filhos */}
      {isExpanded && hasChildren && (
        <div>
          {properties.map(([key, value], index) => {

            if (!isStruct && key === 'value' && properties.length === 1) return null;

            return (
            <div key={index}>
               {Array.isArray(value) ? (
                   <div>
                       {value.length > 0 && (
                         <div className="text-xs text-muted-foreground ml-[28px] mt-1" style={{marginLeft: `${(depth + 1) * 20}px`}}>
                           {key} [{value.length}]:
                         </div>
                       )}
                       {value.map((item, i) => (
                           <ASTNode key={i} node={item} depth={depth + 1} />
                       ))}
                   </div>
               ) : (
                   // Chama recursivamente passando a chave como label
                   <ASTNode node={value} label={key} depth={depth + 1} />
               )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
}

export function ASTOutput({ ast }: ASTOutputProps) {
  if (!ast) {
    return (
      <Card className="h-full flex items-center justify-center border-dashed">
        <CardContent className="text-center pt-6">
          <p className="text-muted-foreground">
            Nenhuma AST disponível.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="pb-2 px-4 pt-4 border-b">
        <CardTitle className="text-lg">Árvore Sintática (AST)</CardTitle>
        <CardDescription>Visualização hierárquica</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 bg-card/50">
        {Array.isArray(ast) ? (
            ast.map((stmt, i) => <ASTNode key={i} node={stmt} />)
        ) : (
            <ASTNode node={ast} />
        )}
      </CardContent>
    </Card>
  );
}