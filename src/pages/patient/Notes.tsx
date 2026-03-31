import { useEffect, useMemo, useState } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createPatientNote, deletePatientNote, listenPatientNotes, PatientNote, updatePatientNote } from "@/services/notes";
import { FileText, Pencil, Trash2 } from "lucide-react";

export default function PatientNotes() {
    const user = auth.currentUser;
    const [notes, setNotes] = useState<PatientNote[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");

    useEffect(() => {
        if (!user?.uid) return;

        const un = listenPatientNotes(user.uid, (list) => {
            setNotes(list);
            setLoading(false);
        });

        return () => un();
    }, [user?.uid]);

    const noteCountLabel = useMemo(() => `${notes.length} note${notes.length === 1 ? "" : "s"}`, [notes.length]);

    const handleCreate = async () => {
        if (!user?.uid) return;
        if (!content.trim()) {
            toast.error("Please write something before saving the note.");
            return;
        }

        try {
            setSaving(true);
            await createPatientNote({
                patientId: user.uid,
                title,
                content,
            });
            setTitle("");
            setContent("");
            toast.success("Note saved.");
        } catch (error) {
            console.error("create note failed", error);
            toast.error("Could not save note.");
        } finally {
            setSaving(false);
        }
    };

    const beginEdit = (note: PatientNote) => {
        setEditingId(note.id);
        setEditTitle(note.title || "");
        setEditContent(note.content || "");
    };

    const saveEdit = async () => {
        if (!editingId) return;
        if (!editContent.trim()) {
            toast.error("Note content cannot be empty.");
            return;
        }

        try {
            await updatePatientNote(editingId, {
                title: editTitle,
                content: editContent,
            });
            setEditingId(null);
            setEditTitle("");
            setEditContent("");
            toast.success("Note updated.");
        } catch (error) {
            console.error("update note failed", error);
            toast.error("Could not update note.");
        }
    };

    const removeNote = async (id: string) => {
        try {
            await deletePatientNote(id);
            toast.success("Note deleted.");
        } catch (error) {
            console.error("delete note failed", error);
            toast.error("Could not delete note.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">My Notes</h1>
                    <p className="text-muted-foreground">Keep personal health notes and reminders.</p>
                </div>
                <Badge variant="outline">{noteCountLabel}</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Write a New Note
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title (optional)"
                    />
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your note here..."
                        className="min-h-28"
                    />
                    <Button onClick={handleCreate} disabled={saving || !content.trim()}>
                        {saving ? "Saving..." : "Save Note"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Saved Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading notes...</p>
                    ) : notes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No notes yet. Create your first note above.</p>
                    ) : (
                        notes.map((note) => (
                            <div key={note.id} className="rounded-lg border p-4 space-y-3">
                                {editingId === note.id ? (
                                    <>
                                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title (optional)" />
                                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-24" />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={saveEdit}>Save</Button>
                                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold">{note.title || "Untitled note"}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Updated: {note.updatedAt ? note.updatedAt.toLocaleString() : "-"}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => beginEdit(note)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => removeNote(note.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
