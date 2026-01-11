import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";
const mockReports = [
    {
        id: "RPT-001",
        name: "Blood Test",
        date: "2026-01-02",
        status: "Reviewed",
        doctor: "Dr. Smith",
        file: "blood-test.pdf",
    },
    {
        id: "RPT-002",
        name: "X-Ray Chest",
        date: "2025-12-20",
        status: "Pending",
        doctor: "Dr. Lee",
        file: "xray-chest.jpg",
    },
    {
        id: "RPT-003",
        name: "MRI Brain",
        date: "2025-11-15",
        status: "Reviewed",
        doctor: "Dr. Patel",
        file: "mri-brain.pdf",
    },
];
export default function Reports() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Medical Reports</h1>
                    <p className="text-muted-foreground">View, download, and upload your health reports securely.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card className="shadow-md p-6 flex flex-col items-center justify-center">
                        <div className="flex flex-row items-center gap-3 mb-2">
                            <FileText className="w-6 h-6 text-primary" />
                            <span className="font-semibold">Total Reports</span>
                        </div>
                        <span className="text-3xl font-bold">{mockReports.length}</span>
                    </Card>
                    <Card className="shadow-md p-6 flex flex-col items-center justify-center">
                        <div className="flex flex-row items-center gap-3 mb-2">
                            <CheckCircle className="w-6 h-6 text-success" />
                            <span className="font-semibold">Reviewed</span>
                        </div>
                        <span className="text-3xl font-bold">{mockReports.filter(r => r.status === "Reviewed").length}</span>
                    </Card>
                    <Card className="shadow-md p-6 flex flex-col items-center justify-center">
                        <div className="flex flex-row items-center gap-3 mb-2">
                            <AlertCircle className="w-6 h-6 text-warning" />
                            <span className="font-semibold">Pending</span>
                        </div>
                        <span className="text-3xl font-bold">{mockReports.filter(r => r.status === "Pending").length}</span>
                    </Card>
                </div>

                {/* Recent Reports Table */}
                <Card className="mb-8 shadow-md p-6">
                    <div className="mb-4">
                        <span className="text-lg font-semibold">Recent Reports</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30">
                                    <th className="px-4 py-2 text-left">Report</th>
                                    <th className="px-4 py-2 text-left">Date</th>
                                    <th className="px-4 py-2 text-left">Doctor</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-left">File</th>
                                    <th className="px-4 py-2 text-left">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockReports.map((r) => (
                                    <tr key={r.id} className="border-b">
                                        <td className="px-4 py-2 font-medium">{r.name}</td>
                                        <td className="px-4 py-2">{r.date}</td>
                                        <td className="px-4 py-2">{r.doctor}</td>
                                        <td className="px-4 py-2">
                                            <Badge className={r.status === "Reviewed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{r.status}</Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                            <a href="#" className="text-primary underline flex items-center gap-1">
                                                <FileText className="w-4 h-4" /> {r.file}
                                            </a>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Button size="sm" className="border">Download</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Upload Section */}
                <Card className="shadow-md p-6">
                    <div className="mb-4">
                        <span className="text-lg font-semibold">Upload New Report</span>
                    </div>
                    <form className="flex flex-col sm:flex-row gap-4 items-center">
                        <Input type="file" className="flex-1" />
                        <Button type="submit" className="bg-primary text-primary-foreground gap-2">
                            <UploadCloud className="w-4 h-4" /> Upload
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}

