import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query as fsQuery, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/firebase";
import { adminCreateUser } from "@/services/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";
import { formatDateTime, safeName } from "./adminUtils";

export default function AdminUsers() {
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [saving, setSaving] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [doctors, setDoctors] = useState<any[]>([]);
    const [caregivers, setCaregivers] = useState<any[]>([]);
    const [assignedDoctorId, setAssignedDoctorId] = useState("");
    const [assignedCaregiverId, setAssignedCaregiverId] = useState("");
    const [doctorCaregiverId, setDoctorCaregiverId] = useState("");

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

    useEffect(() => {
        const unsubDoctors = onSnapshot(fsQuery(collection(db, "users"), where("role", "==", "doctor")), (snap) => {
            setDoctors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        const unsubCaregivers = onSnapshot(fsQuery(collection(db, "users"), where("role", "==", "caregiver")), (snap) => {
            setCaregivers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
        return () => {
            unsubDoctors();
            unsubCaregivers();
        };
    }, []);

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return users.filter((user) => {
            const text = `${user.email || ""} ${user.name || ""} ${user.role || ""}`.toLowerCase();
            return text.includes(term);
        });
    }, [searchTerm, users]);

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

    useEffect(() => {
        if (!selectedProfile || selectedProfile.role !== "patient") {
            setAssignedDoctorId("");
            setAssignedCaregiverId("");
            setDoctorCaregiverId("");
            return;
        }
        setAssignedDoctorId(selectedProfile.assignedDoctorId || selectedProfile.doctorId || "");
        setAssignedCaregiverId(selectedProfile.assignedCaregiverId || selectedProfile.caregiverId || "");
    }, [selectedProfile]);

    useEffect(() => {
        if (!selectedProfile || selectedProfile.role !== "doctor") {
            setDoctorCaregiverId("");
            return;
        }
        setDoctorCaregiverId(selectedProfile.assignedCaregiverId || "");
    }, [selectedProfile]);

    const runAction = async (actionId: string, fn: () => Promise<void>) => {
        try {
            setActionLoading(actionId);
            await fn();
        } catch (error: any) {
            console.error(`admin action ${actionId} failed:`, error);
            toast({ title: "Action failed", description: error?.message || "Please try again.", variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const applySuspend = async (nextSuspended: boolean) => {
        if (!selectedProfile?.id) return;
        await runAction(nextSuspended ? "suspend" : "unsuspend", async () => {
            await setDoc(
                doc(db, "users", selectedProfile.id),
                {
                    suspended: nextSuspended,
                    ...(nextSuspended
                        ? { suspendedAt: serverTimestamp() }
                        : { unsuspendedAt: serverTimestamp() }),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            toast({ title: nextSuspended ? "User suspended" : "User reactivated" });
        });
    };

    const applyDelete = async () => {
        if (!selectedProfile?.id) return;
        const confirmed = window.confirm(`Delete ${safeName(selectedProfile)} permanently? This cannot be undone.`);
        if (!confirmed) return;

        await runAction("delete", async () => {
            await deleteDoc(doc(db, "users", selectedProfile.id));
            toast({ title: "User profile deleted" });
            setSelectedUser(null);
        });
    };

    const saveAssignments = async () => {
        if (!selectedProfile?.id) return;
        await runAction("assignments", async () => {
            await setDoc(
                doc(db, "users", selectedProfile.id),
                {
                    assignedDoctorId: assignedDoctorId || null,
                    assignedCaregiverId: assignedCaregiverId || null,
                    assignedDoctorName: assignedDoctorId ? (doctors.find((d) => d.id === assignedDoctorId)?.name || doctors.find((d) => d.id === assignedDoctorId)?.displayName || doctors.find((d) => d.id === assignedDoctorId)?.email || "") : null,
                    assignedCaregiverName: assignedCaregiverId ? (caregivers.find((c) => c.id === assignedCaregiverId)?.name || caregivers.find((c) => c.id === assignedCaregiverId)?.displayName || caregivers.find((c) => c.id === assignedCaregiverId)?.email || "") : null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            toast({ title: "Assignments updated", description: "Doctor and caregiver assignments saved." });
        });
    };

    const saveDoctorCaregiver = async () => {
        if (!selectedProfile?.id) return;
        await runAction("doctor-caregiver", async () => {
            await setDoc(
                doc(db, "users", selectedProfile.id),
                {
                    assignedCaregiverId: doctorCaregiverId || null,
                    assignedCaregiverName: doctorCaregiverId ? (caregivers.find((c) => c.id === doctorCaregiverId)?.name || caregivers.find((c) => c.id === doctorCaregiverId)?.displayName || caregivers.find((c) => c.id === doctorCaregiverId)?.email || "") : null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            toast({ title: "Caregiver linked", description: "Caregiver assignment for doctor saved." });
        });
    };

    return (
        <AdminLayout title="Admin Users" subtitle="Create login-ready users and monitor all patient, doctor, and caregiver accounts.">
            <Card>
                <CardHeader><CardTitle>Add User</CardTitle></CardHeader>
                <CardContent>
                    <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" onSubmit={submit}>
                        <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
                        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                        <Input placeholder="Temporary Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as any)}>
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="caregiver">Caregiver</option>
                            <option value="admin">Admin</option>
                        </select>
                        <Button type="submit" disabled={saving} className="w-full">{saving ? "Creating..." : "Create User"}</Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-3">
                        This creates both Firebase Authentication login credentials and users collection profile.
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">All Users</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input placeholder="Search by email, name, role" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        {filtered.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No users found.</p>
                        ) : (
                            <div className="space-y-2">
                                {filtered.map((user) => (
                                    <div key={user.id} className={`rounded-md border p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between cursor-pointer transition ${selectedUser?.id === user.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`} onClick={() => setSelectedUser(user)}>
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                                {user.photoURL || user.photoUrl ? (
                                                    <img src={user.photoURL || user.photoUrl} alt={safeName(user)} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm truncate">{safeName(user)}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email || user.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-wrap justify-between sm:justify-end">
                                            <Badge className="text-xs">{user.role || "unknown"}</Badge>
                                            {user.suspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                                            <Badge variant="outline" className="text-xs whitespace-nowrap">Created {formatDateTime(user.createdAt)}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center mb-2">
                                    {selectedProfile.photoURL || selectedProfile.photoUrl ? (
                                        <img src={selectedProfile.photoURL || selectedProfile.photoUrl} alt={safeName(selectedProfile)} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle2 className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </div>
                                <p className="font-medium">{safeName(selectedProfile)}</p>
                                <p className="text-xs text-muted-foreground">{selectedProfile.email || selectedProfile.id}</p>
                                <Badge>{selectedProfile.role || "unknown"}</Badge>
                                {selectedProfile.suspended && <Badge variant="destructive">Suspended</Badge>}
                                <div className="pt-2 space-y-2 border-t mt-2">
                                    <p className="text-sm font-medium">Account Controls</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button
                                            variant={selectedProfile.suspended ? "secondary" : "outline"}
                                            disabled={actionLoading != null}
                                            onClick={() => applySuspend(!Boolean(selectedProfile.suspended))}
                                        >
                                            {selectedProfile.suspended ? "Reactivate User" : "Suspend User"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            disabled={actionLoading != null}
                                            onClick={applyDelete}
                                        >
                                            Delete User Profile
                                        </Button>
                                    </div>
                                </div>

                                {selectedProfile.role === "patient" && (
                                    <div className="pt-2 space-y-3 border-t mt-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">Care Team</p>
                                            <span className="text-[11px] text-muted-foreground">Control who can chat with this patient.</span>
                                        </div>
                                        <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Assigned Doctor</label>
                                                    <select
                                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                                        value={assignedDoctorId}
                                                        onChange={(e) => setAssignedDoctorId(e.target.value)}
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {doctors.map((doc) => (
                                                            <option key={doc.id} value={doc.id}>
                                                                {safeName(doc)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Assigned Caregiver</label>
                                                    <select
                                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                                        value={assignedCaregiverId}
                                                        onChange={(e) => setAssignedCaregiverId(e.target.value)}
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {caregivers.map((cg) => (
                                                            <option key={cg.id} value={cg.id}>
                                                                {safeName(cg)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                                <p className="text-xs text-muted-foreground">Assignments gate chat access for this patient.</p>
                                                <Button
                                                    className="sm:w-auto w-full"
                                                    disabled={actionLoading != null}
                                                    onClick={saveAssignments}
                                                >
                                                    Save Assignments
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedProfile.role === "doctor" && (
                                    <div className="pt-2 space-y-3 border-t mt-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">Linked Caregiver</p>
                                            <span className="text-[11px] text-muted-foreground">Enables doctor ↔ caregiver chat.</span>
                                        </div>
                                        <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Primary Caregiver</label>
                                                <select
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                                    value={doctorCaregiverId}
                                                    onChange={(e) => setDoctorCaregiverId(e.target.value)}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {caregivers.map((cg) => (
                                                        <option key={cg.id} value={cg.id}>
                                                            {safeName(cg)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                                <p className="text-xs text-muted-foreground">Assign one caregiver to link for messaging.</p>
                                                <Button
                                                    className="sm:w-auto w-full"
                                                    disabled={actionLoading != null}
                                                    onClick={saveDoctorCaregiver}
                                                >
                                                    Save Caregiver Link
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
