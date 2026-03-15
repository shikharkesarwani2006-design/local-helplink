"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  updatePassword, 
  deleteUser, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  useUser, 
  useDoc, 
  useFirestore, 
  useMemoFirebase,
  useAuth 
} from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  ShieldCheck, 
  Bell, 
  EyeOff, 
  Palette, 
  Trash2, 
  Loader2, 
  X, 
  Plus, 
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Clock,
  LogOut,
  ChevronRight
} from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form State
  const [profileData, setFormData] = useState({
    name: "",
    phone: "",
    area: "",
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState("");

  // Notification State
  const [notifPrefs, setNotifPrefs] = useState({
    newRequests: true,
    requestAccepted: true,
    newMessages: true,
    ratingsReceived: true,
  });

  // Privacy State
  const [privacyPrefs, setPrivacyPrefs] = useState({
    showPhone: false,
    showEmail: true,
  });

  // Password State
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  const profileRef = useMemoFirebase(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        area: profile.location?.area || "",
        skills: profile.skills || [],
      });
      // Set preferences if they exist, otherwise use defaults
      if (profile.preferences) setNotifPrefs(profile.preferences);
      if (profile.privacy) setPrivacyPrefs(profile.privacy);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!db || !user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: profileData.name,
        phone: profileData.phone,
        "location.area": profileData.area,
        skills: profileData.skills,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Profile updated!", description: "Your changes are now live on the network." });
    } catch (e) {
      toast({ variant: "destructive", title: "Update failed", description: "Please try again later." });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefs = async (type: 'preferences' | 'privacy', data: any) => {
    if (!db || !user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        [type]: data
      });
      toast({ title: "Preferences saved" });
    } catch (e) {
      toast({ variant: "destructive", title: "Save failed" });
    }
  };

  const handleChangePassword = async () => {
    if (!auth || !user || !user.email) return;
    if (passwords.new !== passwords.confirm) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.new);
      toast({ title: "Password changed successfully" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Security error", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await deleteUser(user);
      router.push("/");
      toast({ title: "Account deleted", description: "We're sorry to see you go." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deletion failed", description: "For security, you must have logged in recently to delete your account." });
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profileData.skills.includes(skillInput.trim())) {
      setFormData({ ...profileData, skills: [...profileData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...profileData, skills: profileData.skills.filter(s => s !== skill) });
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20">
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-10 px-6">
        <div className="container max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
            <p className="text-slate-500 font-medium">Manage your campus profile, privacy, and preferences.</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border dark:border-slate-700 shadow-sm">
            <button 
              onClick={() => setTheme("light")}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", theme === 'light' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400")}
            >
              Light
            </button>
            <button 
              onClick={() => setTheme("dark")}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", theme === 'dark' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400")}
            >
              Dark
            </button>
            <button 
              onClick={() => setTheme("system")}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", theme === 'system' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400")}
            >
              System
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl px-6 mx-auto py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-3 space-y-2">
            {[
              { id: "profile", label: "Profile Settings", icon: User },
              { id: "account", label: "Account Security", icon: ShieldCheck },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "privacy", label: "Privacy Controls", icon: EyeOff },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-500 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </aside>

          {/* Content Area */}
          <div className="lg:col-span-9">
            <Tabs value={activeTab} className="w-full">
              {/* PROFILE SETTINGS */}
              <TabsContent value="profile" className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-headline font-bold">Refine Profile</CardTitle>
                    <CardDescription>How you appear to neighbors on the campus network.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="font-bold flex items-center gap-2"><User className="w-3.5 h-3.5 text-primary" /> Full Name</Label>
                        <Input 
                          id="name" 
                          value={profileData.name} 
                          onChange={(e) => setFormData({ ...profileData, name: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-bold flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-primary" /> Contact Number</Label>
                        <Input 
                          id="phone" 
                          value={profileData.phone} 
                          onChange={(e) => setFormData({ ...profileData, phone: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="area" className="font-bold flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" /> Primary Campus Area</Label>
                      <Input 
                        id="area" 
                        placeholder="e.g. Hostel Block A, Main Library..."
                        value={profileData.area} 
                        onChange={(e) => setFormData({ ...profileData, area: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="font-bold">Verified Skills & Expertise</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Add a skill (e.g. Java, Tutoring, Plumbing)..."
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          className="h-12 rounded-xl"
                        />
                        <Button variant="secondary" onClick={addSkill} className="h-12 px-6 rounded-xl font-bold">
                          <Plus className="w-4 h-4 mr-2" /> Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {profileData.skills.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No skills listed yet.</p>
                        ) : (
                          profileData.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border gap-2 group">
                              {skill}
                              <X className="w-3 h-3 cursor-pointer hover:text-red-500 transition-colors" onClick={() => removeSkill(skill)} />
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      Save Profile Changes
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* ACCOUNT SETTINGS */}
              <TabsContent value="account" className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-headline font-bold">Account Security</CardTitle>
                    <CardDescription>Manage credentials and account lifecycle.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-2 gap-8 items-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border dark:border-slate-700">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Login Identity</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {user?.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Account Age</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" /> 
                          Member since {profile?.createdAt ? format(profile.createdAt.toDate(), 'MMMM dd, yyyy') : 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="font-bold flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-primary" /> Change Password</h4>
                      <div className="grid gap-4 max-w-md">
                        <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase text-slate-400">Current Password</Label>
                          <Input 
                            type="password" 
                            className="h-12 rounded-xl"
                            value={passwords.current}
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase text-slate-400">New Password</Label>
                            <Input 
                              type="password" 
                              className="h-12 rounded-xl"
                              value={passwords.new}
                              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-xs uppercase text-slate-400">Confirm New</Label>
                            <Input 
                              type="password" 
                              className="h-12 rounded-xl"
                              value={passwords.confirm}
                              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={handleChangePassword} 
                          disabled={saving || !passwords.current || !passwords.new}
                          className="h-12 rounded-xl font-bold bg-slate-900 dark:bg-white dark:text-slate-900 mt-2"
                        >
                          Update Password
                        </Button>
                      </div>
                    </div>

                    <div className="pt-8 border-t dark:border-slate-800">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                          <h4 className="font-bold text-red-500 text-lg">Permanent Deletion</h4>
                          <p className="text-sm text-slate-500 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="h-12 px-6 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold gap-2">
                              <Trash2 className="w-4 h-4" /> Delete Account
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-[2rem] p-8 max-w-md">
                            <DialogHeader>
                              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4"><Trash2 className="w-8 h-8 text-red-500" /></div>
                              <DialogTitle className="text-2xl font-headline font-bold">Are you absolutely sure?</DialogTitle>
                              <DialogDescription className="text-base pt-2">
                                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-3 pt-6">
                              <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
                              <Button 
                                onClick={handleDeleteAccount}
                                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                              >
                                Delete Account
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* NOTIFICATION SETTINGS */}
              <TabsContent value="notifications" className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-headline font-bold">Notification Settings</CardTitle>
                    <CardDescription>Choose how the community stays in touch with you.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    {[
                      { id: "newRequests", title: "New requests near me", desc: "Alerts when neighbors in your area post a new need.", icon: Zap },
                      { id: "requestAccepted", title: "Request activity", desc: "Notifications when your post is accepted or completed.", icon: CheckCircle2 },
                      { id: "newMessages", title: "Instant messages", desc: "Get notified when someone sends you a chat message.", icon: MessageSquare },
                      { id: "ratingsReceived", title: "Community feedback", desc: "Alerts when someone leaves you a review or rating.", icon: Star },
                    ].map(pref => (
                      <div key={pref.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border dark:border-slate-700 group hover:shadow-md transition-all">
                        <div className="flex gap-4 items-start">
                          <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                            <pref.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{pref.title}</p>
                            <p className="text-xs text-slate-500 font-medium">{pref.desc}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notifPrefs[pref.id as keyof typeof notifPrefs]} 
                          onCheckedChange={(checked) => {
                            const newData = { ...notifPrefs, [pref.id]: checked };
                            setNotifPrefs(newData);
                            handleSavePrefs('preferences', newData);
                          }}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PRIVACY SETTINGS */}
              <TabsContent value="privacy" className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-headline font-bold">Privacy Controls</CardTitle>
                    <CardDescription>Control visibility of your personal information.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4 mb-4">
                      <ShieldCheck className="w-10 h-10 text-blue-600" />
                      <p className="text-sm text-blue-800 dark:text-blue-400 font-medium leading-relaxed">
                        Security Reminder: Your contact details are only shown to neighbors <strong>after</strong> you accept a mission or they accept yours.
                      </p>
                    </div>

                    {[
                      { id: "showPhone", title: "Public phone display", desc: "Allow other members to see your phone number on your profile.", icon: Phone },
                      { id: "showEmail", title: "Public email display", desc: "Allow other members to see your campus email on your profile.", icon: Mail },
                    ].map(pref => (
                      <div key={pref.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border dark:border-slate-700 group hover:shadow-md transition-all">
                        <div className="flex gap-4 items-start">
                          <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                            <pref.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{pref.title}</p>
                            <p className="text-xs text-slate-500 font-medium">{pref.desc}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={privacyPrefs[pref.id as keyof typeof privacyPrefs]} 
                          onCheckedChange={(checked) => {
                            const newData = { ...privacyPrefs, [pref.id]: checked };
                            setPrivacyPrefs(newData);
                            handleSavePrefs('privacy', newData);
                          }}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
