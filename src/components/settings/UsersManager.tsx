import React, { useState, useEffect } from 'react';
import { userService, AppUser, UserRole } from '@/src/services/userService';
import { Trash2, UserPlus, Shield, User, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface UsersManagerProps {
    currentUserEmail: string | null;
}

export default function UsersManager({ currentUserEmail }: UsersManagerProps) {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('USER');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const unsubscribe = userService.subscribeToUsers(
            (data) => {
                setUsers(data);
                setIsLoading(false);
            },
            (err) => {
                console.error("Error loading users:", err);
                toast.error("Impossible de charger la liste des utilisateurs.");
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !currentUserEmail) return;

        setIsAdding(true);
        try {
            await userService.addUser(newEmail, newRole, currentUserEmail);
            toast.success(`${newEmail} a été ajouté avec succès.`);
            setNewEmail('');
            setNewRole('USER');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erreur lors de l'ajout.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteUser = async (user: AppUser) => {
        if (!confirm(`Voulez-vous vraiment supprimer l'accès de ${user.email} ?`)) return;
        
        // Prevent deleting oneself
        if (user.email === currentUserEmail) {
            toast.error("Vous ne pouvez pas supprimer votre propre compte.");
            return;
        }

        try {
            await userService.removeUser(user.id);
            toast.success("Utilisateur supprimé.");
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la suppression.");
        }
    };

    if (isLoading) return <div className="flex items-center gap-2 text-slate-500"><Loader className="w-4 h-4 animate-spin" /> Chargement des utilisateurs...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Gestion des Accès
                    </h3>
                    <p className="text-sm text-slate-500">Gérez qui a le droit d'accéder à l'application.</p>
                </div>
            </div>

            {/* Formulaire d'ajout */}
            <form onSubmit={handleAddUser} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Google</label>
                    <input 
                        type="email" 
                        required
                        placeholder="exemple@gmail.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="w-32">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rôle</label>
                    <select 
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="USER">Utilisateur</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
                <button 
                    type="submit" 
                    disabled={isAdding}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                >
                    {isAdding ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Ajouter
                </button>
            </form>

            {/* Liste */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Utilisateur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rôle</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ajouté le</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">{u.email}</div>
                                    <div className="text-xs text-slate-500">ID: {u.id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {new Date(u.addedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => handleDeleteUser(u)}
                                        className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50"
                                        title="Supprimer l'accès"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                                    Aucun utilisateur autorisé. L'application est probablement ouverte à tous (ou inaccessible).
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
