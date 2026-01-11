export default function PatientHome() {
    return (
        <div>
            {/* Same content as the PatientDashboard main content */}
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Welcome Back, Jane!
                    </h1>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-6">
                        Today&apos;s Health Overview
                    </h2>

                    <div className="flex flex-wrap gap-3">
                        <button className="gap-2 btn">
                            Book Appointment
                        </button>
                        <button className="gap-2 btn btn-outline">
                            Add Note
                        </button>
                        <button className="gap-2 btn btn-outline">
                            Check Reminders
                        </button>
                    </div>
                </div>

                {/* MEDICATION STATUS */}
                <div className="grid grid-cols-1 gap-6 mb-8">
                    <div className="card">
                        <div className="card-header flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Medication Status
                            </span>
                            <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                        </div>
                        <div className="card-content">
                            <div className="text-3xl font-bold text-success">Taken</div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Today’s medication completed
                            </p>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Weekly Health Trends</span>
                            <p className="text-sm text-muted-foreground">
                                Blood Pressure (Systolic)
                            </p>
                        </div>
                        <div className="card-content">
                            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">
                                    Health trend visualization will appear here
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Upcoming Appointments</span>
                        </div>
                        <div className="card-content space-y-4">
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold">Dr. Evelyn Reed</h4>
                                <p className="text-sm text-muted-foreground">
                                    Cardiology • 28 Oct • 10:30 AM
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold">Dr. Ben Carter</h4>
                                <p className="text-sm text-muted-foreground">
                                    Dermatology • 05 Nov • 02:00 PM
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Medication Adherence</span>
                            <p className="text-sm text-muted-foreground">
                                Last 7 days
                            </p>
                        </div>
                        <div className="card-content">
                            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">
                                    Medication adherence visualization will appear here
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
