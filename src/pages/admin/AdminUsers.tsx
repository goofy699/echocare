import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { adminCreateUser } from "@/services/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { formatDateTime, safeName } from "./adminUtils";

export default function AdminUsers() {
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [query, setQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"patient" | "doctor" | "caregiver" | "admin">("patient");

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return users.filter((user) => {
            const text = `${user.email || ""} ${user.name || ""} ${user.role || ""}`.toLowerCase();
            return text.includes(term);
        });
    }, [query, users]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!email.trim() || password.length < 6) {
            toast({ title: "Invalid input", description: "Email and password (6+ chars) are required.", variant: "destructive" });
            return;
        }

        try {
            setSaving(true);
            await adminCreateUser({
                email: email.trim().toLowerCase(),
                password,
                role,
                name: name.trim() || undefined,
            });
            toast({ title: "User created", description: "Auth login and user profile were created." });
            setEmail("");
            setPassword("");
            setName("");
            setRole("patient");
        } catch (error: any) {
            console.error("admin create user failed:", error);
            toast({ title: "Create failed", description: error?.message || "Could not create user.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const selectedProfile = useMemo(() => {
        if (!selectedUser) return null;
        const source = users.find((u) => u.id === selectedUser.id) || selectedUser;
        return {
            ...source,
            allergies: source.allergies || source.patientProfile?.allergies || [],
            chronicConditions: source.chronicConditions || source.patientProfile?.chronicConditions || [],
            currentMedications: source.currentMedications || source.patientProfile?.currentMedications || [],
            primaryConcern: source.primaryConcern || source.patientProfile?.primaryConcern || "",
            emergencyContactName: source.emergencyContactName || source.patientProfile?.emergencyContactName || "",
            emergencyContactPhone: source.emergencyContactPhone || source.patientProfile?.emergencyContactPhone || "",
        };
    }, [selectedUser, users]);

    return (
        <AdminLayout title="Admin Users" subtitle="Create login-ready users and monitor all patient, doctor, and caregiver accounts.">
            <Card>
                <CardHeader><CardTitle>Add User</CardTitle></CardHeader>
                <CardContent>
                    <form className="grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={submit}>
                        <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
                        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                        <Input placeholder="Temporary Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as any)}>
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="caregiver">Caregiver</option>
                            <option value="admin">Admin</option>
                        </select>
                        <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-3">
                        This creates both Firebase Authentication login credentials and users collection profile.
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input placeholder="Search by email, name, role" value={query} onChange={(e) => setQuery(e.target.value)} />
                        {filtered.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No users found.</p>
                        ) : (
                            filtered.map((user) => (
                                <div key={user.id} className={`rounded-md border p-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer ${selectedUser?.id === user.id ? "border-primary" : ""}`} onClick={() => setSelectedUser(user)}>
                                    <div>
                                        <p className="font-medium">{safeName(user)}</p>
                                        <p className="text-xs text-muted-foreground">{user.email || user.id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge>{user.role || "unknown"}</Badge>
                                        <Badge variant="outline">Created {formatDateTime(user.createdAt)}</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>User Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {!selectedProfile ? (
                            <p className="text-sm text-muted-foreground">Select a user to view details.</p>
                        ) : (
                            <>
                                <p className="font-medium">{safeName(selectedProfile)}</p>
                                <p className="text-xs text-muted-foreground">{selectedProfile.email || selectedProfile.id}</p>
                                <Badge>{selectedProfile.role || "unknown"}</Badge>
                                {selectedProfile.role === "patient" && (
                                    <>
                                        <p className="text-sm">Age: {selectedProfile.age || "-"}</p>
                                        <p className="text-sm">Gender: {selectedProfile.gender || "-"}</p>
                                        <p className="text-sm">Blood Group: {selectedProfile.bloodType || "-"}</p>
                                        <p className="text-sm">Primary Concern: {selectedProfile.primaryConcern || "-"}</p>
                                        <p className="text-sm">Allergies: {selectedProfile.allergies?.length ? selectedProfile.allergies.join(", ") : "-"}</p>
                                        <p className="text-sm">Medical Problems: {selectedProfile.chronicConditions?.length ? selectedProfile.chronicConditions.join(", ") : "-"}</p>
                                        <p className="text-sm">Current Medications: {selectedProfile.currentMedications?.length ? selectedProfile.currentMedications.join(", ") : "-"}</p>
                                        <p className="text-sm">Emergency Contact: {selectedProfile.emergencyContactName || selectedProfile.emergencyContactPhone ? `${selectedProfile.emergencyContactName || "-"} ${selectedProfile.emergencyContactPhone ? `(${selectedProfile.emergencyContactPhone})` : ""}` : "-"}</p>
                                    </>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
