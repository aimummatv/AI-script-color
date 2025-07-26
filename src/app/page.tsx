"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { generateCharacterConfidenceScores } from "@/ai/flows/generate-character-confidence-scores";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Plus, Download, Clapperboard, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";

type Character = {
  name: string;
  color: string;
  confidence: number;
  artistName: string;
  dialogueCount: number;
};

const HIGHLIGHT_COLORS = [
  "rgba(168, 224, 255, 0.6)",
  "rgba(255, 218, 179, 0.6)",
  "rgba(189, 245, 189, 0.6)",
  "rgba(255, 192, 203, 0.6)",
  "rgba(221, 160, 221, 0.6)",
  "rgba(240, 230, 140, 0.6)",
  "rgba(173, 216, 230, 0.6)",
  "rgba(255, 182, 193, 0.6)",
  "rgba(144, 238, 144, 0.6)",
  "rgba(255, 250, 205, 0.6)",
];


export default function ScriptStylistPage() {
  const [script, setScript] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCharacterFromLine = useCallback((line: string, charList: Character[]) => {
    const trimmedLine = line.trim();
    const sortedCharList = [...charList].sort((a, b) => b.name.length - a.name.length);

    for (const char of sortedCharList) {
      const baseName = char.name.split('(')[0].trim();
      if (trimmedLine.startsWith(char.name)) {
        return char;
      }
      if (trimmedLine.startsWith(baseName + ":") || trimmedLine.startsWith(baseName + " ")) {
        return char;
      }
    }
    return undefined;
  }, []);

  const calculateDialogueCounts = useCallback((scriptContent: string, charList: Omit<Character, 'dialogueCount' | 'artistName' | 'color'>[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    charList.forEach(c => counts[c.name] = 0);
    
    scriptContent.split('\n').forEach(line => {
      const speakingChar = getCharacterFromLine(line, charList.map(c => ({...c, dialogueCount: 0, artistName: '', color: ''})));
      if (speakingChar) {
        counts[speakingChar.name] = (counts[speakingChar.name] || 0) + 1;
      }
    });
    return counts;
  }, [getCharacterFromLine]);

  const handleProcessScript = async (scriptContent: string) => {
    if (!scriptContent.trim()) {
      toast({ title: "Empty Script", description: "The selected file is empty or contains no text.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setCharacters([]);
    setScript(scriptContent);
    try {
      const result = await generateCharacterConfidenceScores({ script: scriptContent });
      if (result && result.characters) {
        const dialogueCounts = calculateDialogueCounts(scriptContent, result.characters);
        const newCharacters = result.characters
        .sort((a, b) => b.confidence - a.confidence)
        .map((char, index) => ({
          name: char.name,
          confidence: char.confidence,
          color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
          artistName: "",
          dialogueCount: dialogueCounts[char.name] || 0,
        }));
        setCharacters(newCharacters);
        toast({ title: "Success!", description: `${newCharacters.length} characters identified.` });
      } else {
        throw new Error("Invalid response from AI.");
      }
    } catch (error) {
      console.error("Error processing script:", error);
      toast({ title: "Error", description: "Failed to process script. The AI may be unavailable.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            handleProcessScript(result.value);
          } catch (error) {
            console.error("Error parsing .docx file:", error);
            toast({ title: "Error", description: "Could not read the .docx file.", variant: "destructive" });
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          handleProcessScript(content);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleAddCharacter = () => {
    const trimmedName = newCharacterName.trim();
    if (!trimmedName) return;
    if (characters.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Character exists", description: "This character is already in the list.", variant: "destructive" });
      return;
    }
    const dialogueCounts = calculateDialogueCounts(script, [{name: trimmedName, confidence: 1.0}]);
    const newCharacter: Character = {
      name: trimmedName,
      color: HIGHLIGHT_COLORS[characters.length % HIGHLIGHT_COLORS.length],
      confidence: 1.0,
      artistName: "",
      dialogueCount: dialogueCounts[trimmedName] || 0,
    };
    setCharacters(prev => [...prev, newCharacter]);
    setNewCharacterName("");
  };

  const handleDeleteCharacter = (nameToDelete: string) => {
    setCharacters(prev => prev.filter(c => c.name !== nameToDelete));
  };
  
  const handleArtistNameChange = (characterName: string, artistName: string) => {
     setCharacters(prev => prev.map(c => c.name === characterName ? { ...c, artistName } : c));
  };

  const handleExport = () => {
    if (!script.trim() || characters.length === 0) {
      toast({ title: "Nothing to Export", description: "Please process a script and select characters first.", variant: "destructive" });
      return;
    }
    
    let contentToExport = "Character,Artist,Dialogue Count\n";
    characters.forEach(char => {
        contentToExport += `"${char.name}","${char.artistName}",${char.dialogueCount}\n`;
    });

    contentToExport += "\n--- SCRIPT ---\n\n";
    contentToExport += script;
    
    const blob = new Blob([contentToExport], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const highlightedScript = useMemo(() => {
    if (!script) return null;
    return script.split('\n').map((line, index) => {
      const char = getCharacterFromLine(line, characters);
      if (char) {
        return <p key={index} style={{ backgroundColor: char.color, padding: '2px 4px', borderRadius: '3px', margin: '2px 0' }}>{line}</p>;
      }
      return <p key={index} className="py-0.5">{line || " "}</p>;
    });
  }, [script, characters, getCharacterFromLine]);


  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center gap-3">
          <Clapperboard className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold font-headline">Script Stylist</h1>
        </div>
      </header>
      <main className="container mx-auto p-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Your Script</CardTitle>
                <CardDescription>Upload your script to automatically identify characters and their lines.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.md,.text,.docx"
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                  {isLoading ? 'Processing...' : 'Upload Script'}
                </Button>
              </CardContent>
            </Card>
            {script && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-xl">Styled Script</CardTitle>
                  <CardDescription>Review the script with character lines highlighted.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] w-full rounded-lg border p-3 bg-muted/30">
                    <div className="text-sm whitespace-pre-wrap font-code">{highlightedScript}</div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
          <aside className="lg:col-span-1 space-y-8 lg:sticky lg:top-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Identified Characters</CardTitle>
                <CardDescription>Manage characters, assign artists, and view dialogue counts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ScrollArea className="h-[350px] pr-3">
                    <div className="space-y-4">
                      {characters.map((char) => (
                        <div key={char.name} className="flex flex-col gap-3 p-3 rounded-md border bg-secondary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div style={{ backgroundColor: char.color }} className="h-5 w-5 rounded-full border shrink-0"></div>
                              <Label htmlFor={char.name} className="font-medium truncate cursor-pointer">{char.name}</Label>
                              <Badge variant="secondary" className="ml-auto">{(char.confidence * 100).toFixed(0)}%</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 ml-2 shrink-0" onClick={() => handleDeleteCharacter(char.name)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                             <Label htmlFor={`artist-${char.name}`} className="text-xs whitespace-nowrap">Artist:</Label>
                             <Input 
                                id={`artist-${char.name}`} 
                                placeholder="Artist Name" 
                                value={char.artistName} 
                                onChange={(e) => handleArtistNameChange(char.name, e.target.value)} 
                                className="h-8 text-xs focus-visible:ring-primary"
                             />
                          </div>
                           <div className="text-xs text-muted-foreground font-medium">
                                Dialogues: {char.dialogueCount}
                           </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Identifying...</div>
                      )}
                      {!isLoading && characters.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">Upload a script to see characters here.</div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="border-t pt-4">
                    <Label htmlFor="new-char-input" className="font-medium">Add a character manually</Label>
                    <div className="flex gap-2 mt-2">
                      <Input id="new-char-input" placeholder="Character Name" value={newCharacterName} onChange={(e) => setNewCharacterName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()} className="focus-visible:ring-primary"/>
                      <Button onClick={handleAddCharacter} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader><CardTitle className="font-headline text-xl">Actions</CardTitle></CardHeader>
              <CardContent>
                <Button onClick={handleExport} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="mr-2 h-4 w-4" />
                  Export as CSV
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
