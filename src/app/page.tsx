"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { generateCharacterConfidenceScores } from "@/ai/flows/generate-character-confidence-scores";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Plus, Download, Wand2, Clapperboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type Character = {
  name: string;
  color: string;
  confidence: number;
  selected: boolean;
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

const sampleScript = `दो बहुओं की WWF में सास बनी रेफरी

CHARACTER LIST:

अंजलि (छोटी बहू) - 28 - [Main Character]
पूजा (बड़ी बहू) - 30 - [Main Character]
कमला देवी (सास) - 55 - [Main Character]
अमित (छोटा बेटा) - 32 - [Supporting Character]
संजय (बड़ा बेटा) - 35 - [Supporting Character]
सुनीता चाची (रिश्तेदार) - 50 - [Supporting Character]

[NARRATION: बैठक में कुछ रिश्तेदार बैठे हैं और घर की स्थिति देखकर हंस रहे हैं, दोनों बहुएं एक-दूसरे का साथ दे रही हैं]

सुनीता चाची (रिश्तेदार) [हंसकर]: "अरे वाह कमला! तेरे घर में तो कुश्ती चल रही है!
अमित (छोटा बेटा) [परेशान होकर]: "इतना noise क्यों हो रहा है? सुनीता चाची जी आने वाली हैं।"
अंजलि (छोटी बहू): "चुप रहो तुम! तुम्हारी वजह से ही सब हुआ है।"
पूजा (बड़ी बहू): "हाँ, तुम दोनों ने मिलकर मेरा जीना हराम कर दिया है।"
कमला देवी (सास): "बस करो! मेरी भी तो सुनो! घर है ये, कोई कुरुक्षेत्र का मैदान नहीं।"`;

export default function ScriptStylistPage() {
  const [script, setScript] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setScript(sampleScript);
  }, []);

  const getCharacterFromLine = useCallback((line: string, charList: Character[]) => {
    const trimmedLine = line.trim();
    // The AI might return "Character (description)". We should match against the full name first, then just the name.
    // The line itself might be "Character (description): Dialogue..." or "Character: Dialogue..."
    
    // Sort by length descending to match longer names first, e.g. "कमला देवी" before "कमला"
    const sortedCharList = [...charList].sort((a, b) => b.name.length - a.name.length);

    for (const char of sortedCharList) {
      const baseName = char.name.split('(')[0].trim();
      // Exact match "अंजलि (छोटी बहू)" with line starting with "अंजलि (छोटी बहू):"
      if (trimmedLine.startsWith(char.name)) {
        return char;
      }
      // Match "अंजलि" with line starting with "अंजलि:"
      if (trimmedLine.startsWith(baseName + ":") || trimmedLine.startsWith(baseName + " ")) {
         // check for ":" or space to avoid partial matches
        return char;
      }
    }
    return undefined;
  }, []);


  const highlightedScript = useMemo(() => {
    if (!script) {
      return <p className="text-muted-foreground whitespace-pre-wrap font-code p-4">Paste a script and process it to begin.</p>;
    }
    
    const lines = script.split('\n');
    const filteredCharacters = characters.filter(c => c.selected);
    const visibleCharacters = characters.length > 0 ? filteredCharacters : characters;

    if (characters.length > 0 && visibleCharacters.length === 0) {
      return <p className="text-muted-foreground whitespace-pre-wrap font-code p-4">Select characters from the list to view their lines.</p>;
    }
    
    return lines.map((line, index) => {
      const speakingChar = getCharacterFromLine(line, characters);
      
      if (speakingChar) {
        if (visibleCharacters.length === 0 || visibleCharacters.some(vc => vc.name === speakingChar.name)) {
          return (
            <div key={index} style={{ backgroundColor: speakingChar.color }} className="px-2 py-1 my-0.5 rounded-md font-code text-foreground">
              {line || ' '}
            </div>
          );
        }
        return null; 
      }
      
      return <div key={index} className="font-code my-0.5">{line || ' '}</div>;
    }).filter(Boolean);
  }, [script, characters, getCharacterFromLine]);

  const handleProcessScript = async () => {
    if (!script.trim()) {
      toast({ title: "Empty Script", description: "Please paste your script before processing.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setCharacters([]);
    try {
      const result = await generateCharacterConfidenceScores({ script });
      if (result && result.characters) {
        const newCharacters = result.characters
        .sort((a, b) => b.confidence - a.confidence)
        .map((char, index) => ({
          name: char.name,
          confidence: char.confidence,
          color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
          selected: true,
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

  const handleAddCharacter = () => {
    const trimmedName = newCharacterName.trim();
    if (!trimmedName) return;
    if (characters.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Character exists", description: "This character is already in the list.", variant: "destructive" });
      return;
    }
    const newCharacter: Character = {
      name: trimmedName,
      color: HIGHLIGHT_COLORS[characters.length % HIGHLIGHT_COLORS.length],
      confidence: 1.0,
      selected: true,
    };
    setCharacters(prev => [...prev, newCharacter]);
    setNewCharacterName("");
  };

  const handleDeleteCharacter = (nameToDelete: string) => {
    setCharacters(prev => prev.filter(c => c.name !== nameToDelete));
  };

  const handleToggleCharacter = (nameToToggle: string) => {
    setCharacters(prev => prev.map(c => c.name === nameToToggle ? { ...c, selected: !c.selected } : c));
  };

  const handleExport = () => {
    const filteredCharacters = characters.filter(c => c.selected);
    if (!script.trim() || filteredCharacters.length === 0) {
      toast({ title: "Nothing to Export", description: "Please process a script and select characters first.", variant: "destructive" });
      return;
    }
    const contentToExport = script.split('\n').map(line => {
      const speakingChar = getCharacterFromLine(line, filteredCharacters);
      return speakingChar ? line : null;
    }).filter(Boolean).join('\n');
    
    if (!contentToExport.trim()) {
      toast({ title: "No lines found", description: "No lines found for the selected characters." });
      return;
    }
    const blob = new Blob([contentToExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script_export.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
                <CardDescription>Paste your script below. The tool will automatically identify characters and their lines.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Paste your script here..."
                  className="min-h-[250px] font-code bg-muted/30 focus-visible:ring-primary"
                />
                <Button onClick={handleProcessScript} disabled={isLoading} className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Process Script
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Styled Script</CardTitle>
                <CardDescription>Review the highlighted script. Use the controls on the right to filter or export.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] w-full rounded-lg border p-2 bg-muted/30">
                  {highlightedScript}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <aside className="lg:col-span-1 space-y-8 lg:sticky lg:top-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Characters</CardTitle>
                <CardDescription>Manage identified characters. Filter the view by selecting/deselecting.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ScrollArea className="h-[250px] pr-3">
                    <div className="space-y-3">
                      {characters.map((char) => (
                        <div key={char.name} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox id={char.name} checked={char.selected} onCheckedChange={() => handleToggleCharacter(char.name)} />
                            <div style={{ backgroundColor: char.color }} className="h-5 w-5 rounded-full border shrink-0"></div>
                            <Label htmlFor={char.name} className="font-medium truncate cursor-pointer">{char.name}</Label>
                            <Badge variant="secondary" className="ml-auto">{(char.confidence * 100).toFixed(0)}%</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" onClick={() => handleDeleteCharacter(char.name)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Identifying...</div>
                      )}
                      {!isLoading && characters.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">No characters identified yet.</div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="border-t pt-4">
                    <Label htmlFor="new-char-input" className="font-medium">Add a character</Label>
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
                  Export Filtered Script (.txt)
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

    