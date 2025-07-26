
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { generateCharacterConfidenceScores } from "@/ai/flows/generate-character-confidence-scores";
import { validateApiKey } from "@/ai/flows/validate-api-key";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Plus, Download, Clapperboard, FileUp, FileText, FileCode, Shuffle, BrainCircuit, Settings, KeyRound, Users, Pencil, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, ShadingType, HeadingLevel, AlignmentType, TabStopType } from "docx";
import { saveAs } from 'file-saver';
import { ThemeToggle } from "@/components/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";


type Character = {
  name: string;
  color: string;
  confidence: number;
  artistName: string;
  dialogueCount: number;
};

const HIGHLIGHT_COLORS = [
  "a8e0ff",
  "ffdab3",
  "bdf5bd",
  "ffc0cb",
  "dda0dd",
  "f0e68c",
  "add8e6",
  "ffb6c1",
  "90ee90",
  "fffacd",
];

const HIGHLIGHT_COLORS_RGBA = [
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
  const scriptContentRef = useRef<HTMLDivElement>(null);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isGroupedByCharacter, setIsGroupedByCharacter] = useState(false);
  const [editingCharacterName, setEditingCharacterName] = useState<string | null>(null);
  const [editingCharacterNewName, setEditingCharacterNewName] = useState("");

  useEffect(() => {
    const storedApiKey = localStorage.getItem("gemini_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setTempApiKey(storedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    localStorage.setItem("gemini_api_key", tempApiKey);
    setIsSettingsOpen(false);
    toast({ title: "API Key Saved", description: "Your Google AI API key has been saved locally." });
  };

  const handleTestApiKey = async () => {
    if (!tempApiKey) {
      toast({ title: "API Key Missing", description: "Please enter an API key to test.", variant: "destructive" });
      return;
    }
    setIsTestingKey(true);
    try {
      const result = await validateApiKey({ apiKey: tempApiKey });
      if (result.isValid) {
        toast({ title: "Success!", description: "Your API key is valid.", variant: "default" });
      } else {
        toast({ title: "Invalid API Key", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("API Key validation error:", error);
      toast({ title: "Invalid API Key", description: "An unexpected error occurred. Please check the console for details.", variant: "destructive" });
    } finally {
      setIsTestingKey(false);
    }
  };


  const getCharacterFromLine = useCallback((line: string, charList: Character[]) => {
    const trimmedLine = line.trim();
    const sortedCharList = [...charList].sort((a, b) => b.name.length - a.name.length);

    for (const char of sortedCharList) {
        const charName = char.name.trim();
        if (trimmedLine.toUpperCase().startsWith(charName.toUpperCase())) {
            const nextCharIndex = charName.length;
            if (trimmedLine.length === nextCharIndex || !/^[a-zA-Z0-9]/.test(trimmedLine[nextCharIndex])) {
                 return char;
            }
        }
    }

    return undefined;
  }, []);

  const calculateDialogueCounts = useCallback((scriptContent: string, charList: Omit<Character, 'dialogueCount' | 'artistName' | 'color'>[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    charList.forEach(c => counts[c.name] = 0);
    
    const mappedCharList = charList.map(c => ({...c, dialogueCount: 0, artistName: '', color: ''}));

    if(scriptContent){
        scriptContent.split('\n').forEach(line => {
          const speakingChar = getCharacterFromLine(line, mappedCharList);
          if (speakingChar) {
            counts[speakingChar.name] = (counts[speakingChar.name] || 0) + 1;
          }
        });
    }

    return counts;
  }, [getCharacterFromLine]);

  const identifyCharactersWithRules = (scriptContent: string): { name: string, confidence: number }[] => {
    const lines = scriptContent.split('\n');
    const potentialCharacters = new Set<string>();
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0 && trimmedLine.length < 50 && /^[^a-z]+$/.test(trimmedLine) && !trimmedLine.startsWith('(')) {
            if (!/^(INT\.?\/EXT\.?|INT\.?|EXT\.?|FADE IN:|FADE OUT:|CUT TO:|CONTINUED|BACK TO:|DISSOLVE TO:)/i.test(trimmedLine)) {
                const cleanName = trimmedLine.replace(/\s*\(.*\)$/, '').trim();
                if(cleanName) potentialCharacters.add(cleanName);
            }
        }
    });
    
    return Array.from(potentialCharacters).map(name => ({ name: name.trim(), confidence: 0.8 }));
  };

  const processIdentifiedCharacters = (
    identifiedChars: { name: string; confidence: number }[], 
    scriptContent: string
  ) => {
    const dialogueCounts = calculateDialogueCounts(scriptContent, identifiedChars);
    const newCharacters = identifiedChars
      .sort((a, b) => (dialogueCounts[b.name] || 0) - (dialogueCounts[a.name] || 0))
      .map((char, index) => ({
        name: char.name,
        confidence: char.confidence,
        color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
        artistName: "",
        dialogueCount: dialogueCounts[char.name] || 0,
      }));
    
    setCharacters(newCharacters);
    return newCharacters;
  };


  const handleProcessScript = async (scriptContent: string) => {
    if (!scriptContent.trim()) {
      toast({ title: "Empty Script", description: "The selected file is empty or contains no text.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setCharacters([]);
    setScript(scriptContent);

    const processWithFallback = () => {
        const ruleBasedChars = identifyCharactersWithRules(scriptContent);
        if(ruleBasedChars.length > 0){
          const newChars = processIdentifiedCharacters(ruleBasedChars, scriptContent);
          toast({ title: "Fallback Success!", description: `Identified ${newChars.length} characters with basic rules.` });
        } else {
          toast({ title: "No Characters Found", description: "Couldn't identify characters automatically. Please add them manually.", variant: "destructive" });
        }
    };
    
    if (isAiEnabled) {
      if (!apiKey) {
        toast({
            title: "API Key Required",
            description: "Please set your Google AI API key in the settings to use AI features.",
            variant: "destructive",
        });
        setIsLoading(false);
        processWithFallback();
        return;
      }
      try {
        const result = await generateCharacterConfidenceScores({ script: scriptContent, apiKey });
        if (result && result.characters && result.characters.length > 0) {
          const newChars = processIdentifiedCharacters(result.characters, scriptContent);
          toast({ title: "Success!", description: `AI identified ${newChars.length} characters.` });
        } else {
          throw new Error("AI returned no characters.");
        }
      } catch (error) {
        console.error("AI Error, falling back to rule-based method:", error);
        toast({ 
          title: "AI Unavailable", 
          description: "Using fallback method to find characters. Results may be less accurate.",
          variant: "default" 
        });
        processWithFallback();
      }
    } else {
      toast({ title: "AI Disabled", description: "Using rule-based method to find characters." });
      processWithFallback();
    }

    setIsLoading(false);
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
    
    const tempCharListForCounting = [{ name: trimmedName, confidence: 1.0 }];
    const dialogueCounts = calculateDialogueCounts(script, tempCharListForCounting);
  
    const newCharacter: Character = {
      name: trimmedName,
      color: HIGHLIGHT_COLORS[characters.length % HIGHLIGHT_COLORS.length],
      confidence: 1.0, 
      artistName: "",
      dialogueCount: dialogueCounts[trimmedName] || 0,
    };
  
    setCharacters(prev => [...prev, newCharacter].sort((a,b) => b.dialogueCount - a.dialogueCount));
    setNewCharacterName("");
  };

  const handleDeleteCharacter = (nameToDelete: string) => {
    setCharacters(prev => prev.filter(c => c.name !== nameToDelete));
  };
  
  const handleArtistNameChange = (characterName: string, artistName: string) => {
     setCharacters(prev => prev.map(c => c.name === characterName ? { ...c, artistName } : c));
  };

  const handleEditCharacter = (name: string) => {
    setEditingCharacterName(name);
    setEditingCharacterNewName(name);
  };

  const handleSaveCharacterName = (oldName: string) => {
    const newName = editingCharacterNewName.trim();
    if (!newName) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    if (newName !== oldName && characters.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
      toast({ title: "Character exists", description: "This name is already in use.", variant: "destructive" });
      return;
    }

    const dialogueCounts = calculateDialogueCounts(script, [{ name: newName, confidence: 1.0 }]);

    setCharacters(prev =>
      prev.map(c =>
        c.name === oldName
          ? { ...c, name: newName, dialogueCount: dialogueCounts[newName] || 0 }
          : c
      ).sort((a,b) => b.dialogueCount - a.dialogueCount)
    );

    setEditingCharacterName(null);
    setEditingCharacterNewName("");
  };


  const handleRandomizeColors = () => {
    if (characters.length === 0) {
        toast({ title: "No Characters", description: "Please process a script first.", variant: "destructive" });
        return;
    };
    
    const shuffledColors = [...HIGHLIGHT_COLORS].sort(() => Math.random() - 0.5);
    
    setCharacters(prev => 
        prev.map((char, index) => ({
            ...char,
            color: shuffledColors[index % shuffledColors.length],
        }))
    );

    toast({ title: "Colors Randomized!", description: "Character highlight colors have been shuffled." });
  };

  const handleExportCsv = () => {
    if (!script.trim() || characters.length === 0) {
      toast({ title: "Nothing to Export", description: "Please process a script and select characters first.", variant: "destructive" });
      return;
    }
    
    let contentToExport = "Character,Artist,Dialogue Count\n";
    characters.forEach(char => {
        contentToExport += `"${char.name}","${char.artistName}",${char.dialogueCount}\n`;
    });

    contentToExport += "\n--- SCRIPT ---\n\n";
    
    if (isGroupedByCharacter) {
        characters.forEach(char => {
            contentToExport += `\n--- ${char.name} ---\n`;
            script.split('\n').forEach(line => {
                const speakingChar = getCharacterFromLine(line, [char]);
                if (speakingChar) {
                    contentToExport += line + '\n';
                }
            });
        });
    } else {
        contentToExport += script;
    }
    
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

  const handleExportPdf = () => {
    const scriptElement = scriptContentRef.current;
    if (!scriptElement || !script.trim()) {
      toast({ title: "Nothing to Export", description: "Please process a script first.", variant: "destructive" });
      return;
    }

    toast({ title: "Generating PDF...", description: "This may take a moment."});

    const body = document.body;
    const originalBackgroundColor = body.style.backgroundColor;
    body.style.backgroundColor = window.getComputedStyle(body).backgroundColor;


    html2canvas(scriptElement, {
      scale: 2, 
      useCORS: true,
      backgroundColor: window.getComputedStyle(document.body).backgroundColor,
    }).then(canvas => {
      document.body.style.backgroundColor = originalBackgroundColor;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth - 20; 
      const height = width / ratio;
      
      let position = 10;
      let pageHeight = height;

      if (pageHeight > (pdfHeight - 20)) {
        pageHeight = pdfHeight - 20;
      }

      pdf.addImage(imgData, 'PNG', 10, position, width, height);
      let heightLeft = height - pageHeight;

      while (heightLeft > 0) {
        position = -pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, width, height);
        heightLeft -= pageHeight;
      }

      pdf.save('styled_script.pdf');
    }).catch(err => {
      document.body.style.backgroundColor = originalBackgroundColor;
      console.error("Error generating PDF:", err);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    });
  };

  const handleExportDocx = () => {
    if (!script.trim()) {
        toast({ title: "Nothing to Export", description: "Please process a script first.", variant: "destructive" });
        return;
    }

    toast({ title: "Generating DOCX...", description: "This may take a moment." });

    try {
        const characterParagraphs = [
            new Paragraph({ text: "Character List", heading: HeadingLevel.HEADING_1 }),
            ...characters.map(char => {
                const textRuns = [
                    new TextRun({
                        text: char.name,
                        bold: true,
                    }),
                    new TextRun({ text: "\t", }),
                    new TextRun({
                        text: char.artistName || '',
                    }),
                    new TextRun({ text: "\t", }),
                     new TextRun({
                        text: `(${char.dialogueCount} dialogues)`,
                    }),
                ];

                return new Paragraph({
                    children: textRuns,
                    shading: {
                        type: ShadingType.CLEAR,
                        fill: char.color,
                        color: "auto",
                    },
                     tabStops: [
                        { type: TabStopType.CENTER, position: 4500 },
                        { type: TabStopType.RIGHT, position: 7000 },
                    ],
                });
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Script", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "" }), 
        ];

        let scriptParagraphs: Paragraph[] = [];

        if (isGroupedByCharacter) {
             characters.forEach(char => {
                scriptParagraphs.push(new Paragraph({ 
                    text: char.name, 
                    heading: HeadingLevel.HEADING_2,
                    shading: {
                        type: ShadingType.CLEAR,
                        fill: char.color,
                        color: "auto",
                    },
                }));

                const dialogueLines = script.split('\n').filter(line => {
                    const speakingChar = getCharacterFromLine(line, [char]);
                    return !!speakingChar;
                });
                
                dialogueLines.forEach(line => {
                    scriptParagraphs.push(new Paragraph({
                        children: [new TextRun(line)],
                    }));
                });
                scriptParagraphs.push(new Paragraph({ text: "" }));
            });

        } else {
            scriptParagraphs = script.split('\n').map(line => {
                const char = getCharacterFromLine(line, characters);
                if (char) {
                    return new Paragraph({
                        children: [new TextRun(line)],
                        shading: {
                            type: ShadingType.CLEAR,
                            fill: char.color,
                            color: "auto",
                        },
                    });
                }
                return new Paragraph({ children: [new TextRun(line)] });
            });
        }


        const doc = new Document({
            sections: [{
                properties: {},
                children: [...characterParagraphs, ...scriptParagraphs],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, "styled_script.docx");
            toast({ title: "Success!", description: "DOCX file generated." });
        });
    } catch (err) {
        console.error("Error generating DOCX:", err);
        toast({ title: "Error", description: "Failed to generate DOCX.", variant: "destructive" });
    }
};

  
  const highlightedScript = useMemo(() => {
    if (!script) return null;
    return script.split('\n').map((line, index) => {
      const char = getCharacterFromLine(line, characters);
      if (char) {
        const colorIndex = HIGHLIGHT_COLORS.indexOf(char.color);
        const rgbaColor = HIGHLIGHT_COLORS_RGBA[colorIndex % HIGHLIGHT_COLORS_RGBA.length];
        return <p key={index} style={{ backgroundColor: rgbaColor, padding: '2px 4px', borderRadius: '3px', margin: '2px 0', lineHeight: 1.5 }}>{line}</p>;
      }
      return <p key={index} className="py-0.5" style={{ lineHeight: 1.5 }}>{line || " "}</p>;
    });
  }, [script, characters, getCharacterFromLine]);

  const groupedScript = useMemo(() => {
    if (!script || !characters.length) return null;

    return characters.map(char => {
        const colorIndex = HIGHLIGHT_COLORS.indexOf(char.color);
        const rgbaColor = HIGHLIGHT_COLORS_RGBA[colorIndex % HIGHLIGHT_COLORS_RGBA.length];

        const dialogueLines = script.split('\n').filter(line => {
            const speakingChar = getCharacterFromLine(line, [char]);
            return !!speakingChar;
        });

        if (dialogueLines.length === 0) return null;

        return (
            <div key={char.name} className="mb-6">
                <h3 className="font-headline text-lg font-bold p-2 rounded-md mb-2" style={{ backgroundColor: rgbaColor }}>
                    {char.name}
                </h3>
                <div className="pl-4 border-l-4" style={{ borderColor: `#${char.color}`}}>
                    {dialogueLines.map((line, index) => (
                        <p key={`${char.name}-${index}`} className="py-0.5" style={{ lineHeight: 1.5 }}>{line}</p>
                    ))}
                </div>
            </div>
        );
    });
  }, [script, characters, getCharacterFromLine]);

  const CharacterSummary = () => (
    <div className="mb-6 p-4 border rounded-lg bg-secondary/30">
        <h3 className="font-headline text-lg font-bold mb-3">Character List</h3>
        <div className="space-y-2 text-sm">
            {characters.map(char => {
                 const colorIndex = HIGHLIGHT_COLORS.indexOf(char.color);
                 const rgbaColor = HIGHLIGHT_COLORS_RGBA[colorIndex % HIGHLIGHT_COLORS_RGBA.length];
                 return (
                    <div key={char.name} className="grid grid-cols-[1fr_auto] gap-x-4 items-center p-2 rounded-md" style={{ backgroundColor: rgbaColor }}>
                        <div className="flex items-center gap-2 truncate">
                           <div style={{ backgroundColor: `#${char.color}` }} className="h-4 w-4 rounded-full border shrink-0"></div>
                           <span className="font-semibold truncate">{char.name}</span>
                           <span className="text-muted-foreground truncate">{char.artistName && `- ${char.artistName}`}</span>
                        </div>
                        <div className="text-right font-medium">{char.dialogueCount} dialogues</div>
                    </div>
                 );
            })}
        </div>
    </div>
  );

  const CharacterListSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3 p-3 rounded-md border bg-secondary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <Skeleton className="h-4 w-1/5 ml-auto" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-full" />
          </div>
           <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6" />
            </div>
        </div>
      ))}
    </div>
  );
  
  const ScriptContentSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3 mb-6" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );

  const InitialScriptContentPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 text-primary/20" />
        <h3 className="font-headline text-lg font-semibold">Ready for your script</h3>
        <p className="max-w-xs">Upload a file or paste your script to get started. The styled version will appear here.</p>
    </div>
);


  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Clapperboard className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold font-headline">Script Stylist</h1>
            </div>
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Settings</span>
                </Button>
                <ThemeToggle />
            </div>
        </div>
      </header>
      <main className="container mx-auto p-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-md">
               <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-xl">Your Script</CardTitle>
                  <CardDescription>Upload your script to automatically identify characters and their lines.</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="ai-toggle" checked={isAiEnabled} onCheckedChange={setIsAiEnabled} disabled={isLoading}/>
                      <Label htmlFor="ai-toggle" className="flex items-center gap-2 cursor-pointer">
                        <BrainCircuit className="h-5 w-5 text-primary"/>
                        <span className="font-medium">Use AI</span>
                      </Label>
                    </div>
                </div>
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
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-xl">Styled Script</CardTitle>
                  <CardDescription>Review the script with character lines highlighted.</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                      <Switch id="group-by-char" checked={isGroupedByCharacter} onCheckedChange={setIsGroupedByCharacter} disabled={characters.length === 0 || isLoading}/>
                      <Label htmlFor="group-by-char" className="flex items-center gap-2 cursor-pointer">
                        <Users className="h-5 w-5 text-primary"/>
                        <span className="font-medium">Group by Character</span>
                      </Label>
                  </div>
                  <Button onClick={handleRandomizeColors} variant="outline" size="sm" disabled={characters.length === 0 || isLoading}>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Randomize
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] w-full rounded-lg border p-4 bg-muted/30">
                  <div ref={scriptContentRef} className="text-sm whitespace-pre-wrap font-code h-full">
                    {isLoading && !script ? (
                      <ScriptContentSkeleton />
                    ) : script ? (
                      <>
                        <CharacterSummary />
                        {isGroupedByCharacter ? groupedScript : highlightedScript}
                      </>
                    ) : (
                      <InitialScriptContentPlaceholder />
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
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
                    {isLoading ? (
                      <CharacterListSkeleton />
                    ) : (
                      <div className="space-y-4">
                        {characters.map((char) => (
                          <div key={char.name} className="flex flex-col gap-3 p-3 rounded-md border bg-secondary/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div style={{ backgroundColor: `#${char.color}` }} className="h-5 w-5 rounded-full border shrink-0 mt-0.5"></div>
                              <div className="flex-1 min-w-0">
                                {editingCharacterName === char.name ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingCharacterNewName}
                                      onChange={(e) => setEditingCharacterNewName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveCharacterName(char.name);
                                        if (e.key === 'Escape') setEditingCharacterName(null);
                                      }}
                                      className="h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button size="icon" className="h-8 w-8" onClick={() => handleSaveCharacterName(char.name)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Label className="font-medium break-all">{char.name}</Label>
                                )}
                                <div className="text-xs text-muted-foreground font-medium mt-1">
                                  Dialogues: {char.dialogueCount}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant="secondary" className="shrink-0">{(char.confidence * 100).toFixed(0)}%</Badge>
                                {editingCharacterName !== char.name && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCharacter(char.name)}>
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3">
                               <div className="w-5"></div>
                               <div className="flex items-center gap-2">
                                 <Label htmlFor={`artist-${char.name}`} className="text-xs whitespace-nowrap">Artist:</Label>
                                 <Input 
                                    id={`artist-${char.name}`} 
                                    placeholder="Artist Name" 
                                    value={char.artistName} 
                                    onChange={(e) => handleArtistNameChange(char.name, e.target.value)} 
                                    className="h-8 text-xs focus-visible:ring-primary"
                                    disabled={editingCharacterName === char.name}
                                 />
                               </div>
                               <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCharacter(char.name)}>
                                 <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                               </Button>
                            </div>
                          </div>
                        ))}
                        {!isLoading && characters.length === 0 && (
                          <div className="text-center text-muted-foreground py-4">Upload a script to see characters here.</div>
                        )}
                      </div>
                    )}
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
              <CardContent className="space-y-3">
                <Button onClick={handleExportCsv} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="mr-2 h-4 w-4" />
                  Export as CSV
                </Button>
                <Button onClick={handleExportPdf} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </Button>
                 <Button onClick={handleExportDocx} className="w-full">
                  <FileCode className="mr-2 h-4 w-4" />
                  Export as DOCX
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

       <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Settings</DialogTitle>
            <DialogDescription>
              Enter your Google AI API key to enable AI-powered features. Your key is saved securely in your browser's local storage and is never shared.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="api-key-input" className="text-right">
                API Key
              </Label>
              <Input
                id="api-key-input"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="col-span-3"
                placeholder="Enter your Google AI API Key"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button onClick={handleTestApiKey} variant="outline" disabled={isTestingKey}>
              {isTestingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              {isTestingKey ? 'Testing...' : 'Test Key'}
            </Button>
            <Button onClick={handleSaveApiKey}>Save Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
