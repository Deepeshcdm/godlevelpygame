import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listSaves, deleteSave, SaveMetadata } from '../lib/saveManager';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';

export const Account: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [saves, setSaves] = useState<SaveMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate('/');
      return;
    }
    loadSaves();
  }, [user, navigate, authLoading]);

  const loadSaves = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userSaves = await listSaves(user.uid);
      setSaves(userSaves);
      setError('');
    } catch (err: any) {
      setError('Failed to load saves');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSave = async (slotName: string) => {
    if (!user) return;
    
    if (!confirm(`Delete save "${slotName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteSave(user.uid, slotName);
      await loadSaves(); // Refresh list
    } catch (err: any) {
      setError('Failed to delete save');
      console.error(err);
    }
  };

  const handleLoadSave = (slotName: string) => {
    // Navigate to game with slot parameter
    navigate(`/?load=${slotName}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/'); // Redirect to login page after sign out
    } catch (err: any) {
      setError('Failed to sign out');
      console.error(err);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {user?.displayName || user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Saves</CardTitle>
            <CardDescription>
              Manage your game progress saves. Click "Load" to play from a specific save.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <p className="text-center text-muted-foreground">Loading saves...</p>
            ) : saves.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No saves yet. Start playing to create your first save!
              </p>
            ) : (
              <div className="space-y-3">
                {saves.map((save) => (
                  <Card key={save.saveId} className="bg-slate-800/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {save.displayName || (save.slotName === 'autosave' ? 'Auto Save' : save.slotName)}
                            </h3>
                            {save.slotName === 'autosave' && (
                              <Badge variant="secondary" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Level {save.playerLevel} • {save.playerXp} XP • Position ({save.playerPosition?.x}, {save.playerPosition?.y})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(save.timestamp)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleLoadSave(save.slotName)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Load
                          </Button>
                          {save.slotName !== 'autosave' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSave(save.slotName)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Game
          </Button>
        </div>
      </div>
    </div>
  );
};
