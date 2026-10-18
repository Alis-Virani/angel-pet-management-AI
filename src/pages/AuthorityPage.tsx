import React, { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { deleteApp, initializeApp } from 'firebase/app';
import { AUTHORITY_MODULES, AuthorityModule, EmployeeProfile, ModulePermissions, PermissionAction } from '../types';
import { auth, db } from '../firebase/config';
import { useAuth } from '../auth/AuthContext';
import { AlertCircle, Check, Loader2, Plus, Save, ShieldCheck, UserRoundX } from 'lucide-react';

const ACTIONS: Array<{ key: PermissionAction; label: string }> = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' }
];

const emptyPermissions = (): ModulePermissions => {
  const permissions = {} as ModulePermissions;
  AUTHORITY_MODULES.forEach(({ key }) => { permissions[key] = []; });
  return permissions;
};

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unable to save employee access.';

export const AuthorityPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<ModulePermissions>(emptyPermissions);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);

  const loadEmployees = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'userProfiles'));
      setEmployees(snapshot.docs.map((item) => item.data() as EmployeeProfile));
    } catch (loadError) {
      console.error('Failed to load employee accounts:', loadError);
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadEmployees(); }, []);

  const togglePermission = (module: AuthorityModule, action: PermissionAction) => {
    setPermissions((current) => {
      const moduleActions = current[module] || [];
      const nextActions = moduleActions.includes(action)
        ? moduleActions.filter((item) => item !== action)
        : [...moduleActions, action];
      return { ...current, [module]: nextActions };
    });
  };

  const beginEdit = (employee: EmployeeProfile) => {
    setEditingEmployee(employee);
    setName(employee.displayName);
    setPermissions({ ...emptyPermissions(), ...employee.permissions });
    setError('');
    setSuccess('');
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setPassword('');
    setPermissions(emptyPermissions());
    setError('');
  };

  const handleSaveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth || !db || !auth.currentUser) {
      setError('Firebase Authentication is unavailable.');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    if (editingEmployee) {
      try {
        const updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'userProfiles', editingEmployee.uid), {
          displayName: name.trim(),
          permissions,
          updatedAt
        });
        setEmployees((current) => current.map((item) => item.uid === editingEmployee.uid
          ? { ...item, displayName: name.trim(), permissions, updatedAt }
          : item));
        setSuccess('Employee permissions saved.');
        resetForm();
      } catch (saveError) {
        console.error('Failed to update employee permissions:', saveError);
        setError(errorMessage(saveError));
      } finally {
        setSaving(false);
      }
      return;
    }

    const employeeEmail = email.trim().toLowerCase();
    const secondaryApp = initializeApp(
      {
        apiKey: auth.app.options.apiKey,
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
        storageBucket: auth.app.options.storageBucket,
        messagingSenderId: auth.app.options.messagingSenderId,
        appId: auth.app.options.appId
      },
      `employee-create-${Date.now()}`
    );
    const secondaryAuth = getAuth(secondaryApp);
    let createdUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'] | null = null;
    try {
      const result = await createUserWithEmailAndPassword(secondaryAuth, employeeEmail, password);
      createdUser = result.user;
      const timestamp = new Date().toISOString();
      const profile: EmployeeProfile = {
        uid: result.user.uid,
        email: employeeEmail,
        displayName: name.trim(),
        active: true,
        permissions,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await setDoc(doc(db, 'userProfiles', result.user.uid), profile);
      await signOut(secondaryAuth);
      setEmployees((current) => [profile, ...current]);
      setSuccess('Employee account created. Share the initial password securely.');
      resetForm();
    } catch (createError) {
      console.error('Failed to create employee account:', createError);
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error('Could not remove employee account after profile creation failed:', cleanupError);
        }
      }
      setError(errorMessage(createError));
    } finally {
      await deleteApp(secondaryApp);
      setSaving(false);
    }
  };

  const handleActiveToggle = async (employee: EmployeeProfile) => {
    if (!db) return;
    setError('');
    try {
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'userProfiles', employee.uid), { active: !employee.active, updatedAt });
      setEmployees((current) => current.map((item) => item.uid === employee.uid
        ? { ...item, active: !employee.active, updatedAt }
        : item));
    } catch (toggleError) {
      console.error('Failed to update employee status:', toggleError);
      setError(errorMessage(toggleError));
    }
  };

  const handlePasswordReset = async (employee: EmployeeProfile) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, employee.email);
      setSuccess(`Password reset email sent to ${employee.email}.`);
    } catch (resetError) {
      console.error('Failed to send employee password reset:', resetError);
      setError(errorMessage(resetError));
    }
  };

  if (!isAdmin) {
    return <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-700">Administrator access is required to manage employee accounts.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Authority & Permissions</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">Manage individual employee sign-in accounts and module access.</p>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">{success}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-blue-600" /> Employee Accounts
          </div>
          {loading ? <div className="py-8 text-center text-sm text-slate-400">Loading employees…</div> : employees.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No employee accounts have been created yet.</div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <article key={employee.uid} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{employee.displayName}</div>
                    <div className="truncate text-xs text-slate-500">{employee.email}</div>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${employee.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {employee.active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => beginEdit(employee)} className="min-h-10 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100">Permissions</button>
                    <button onClick={() => void handlePasswordReset(employee)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Reset password</button>
                    <button onClick={() => void handleActiveToggle(employee)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${employee.active ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      {employee.active ? <UserRoundX className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      {employee.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={handleSaveEmployee} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-sm font-bold text-slate-800">{editingEmployee ? 'Edit Employee Access' : 'Create Employee Account'}</div>
            {editingEmployee && <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500 hover:text-slate-900">New employee</button>}
          </div>
          <label className="block"><span className="form-label">Employee name</span><input required value={name} onChange={(event) => setName(event.target.value)} className="form-input" /></label>
          {!editingEmployee && (
            <>
              <label className="block"><span className="form-label">Work email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="form-input" /></label>
              <label className="block"><span className="form-label">Initial password</span><input type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="form-input" /><span className="mt-1 block text-[11px] text-slate-500">The employee can change it using the password reset email.</span></label>
            </>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><th className="p-2.5">Module</th>{ACTIONS.map((action) => <th key={action.key} className="p-2 text-center">{action.label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {AUTHORITY_MODULES.map((module) => (
                  <tr key={module.key}>
                    <th scope="row" className="whitespace-nowrap p-2.5 font-semibold text-slate-700">{module.label}</th>
                    {ACTIONS.map((action) => (
                      <td key={action.key} className="p-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${action.label} ${module.label}`}
                          checked={permissions[module.key]?.includes(action.key) || false}
                          onChange={() => togglePermission(module.key, action.key)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button disabled={saving} className="btn-primary w-full justify-center disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEmployee ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Saving…' : editingEmployee ? 'Save permissions' : 'Create employee'}
          </button>
        </form>
      </div>
    </div>
  );
};
