import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { User as UserIcon, Upload } from 'lucide-react';

const AvatarUploader = () => {
    const { user, profile, refreshProfile } = useAuth();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !user) {
            return;
        }

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);

        // Remove the old avatar to prevent orphaned files
        if (profile?.avatar_url) {
            const oldFileName = profile.avatar_url.split('/').pop();
            if (oldFileName) {
                await supabase.storage.from('avatars').remove([oldFileName]);
            }
        }

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            showError('Failed to upload avatar.');
            console.error('Upload error:', uploadError);
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', user.id);

        if (updateError) {
            showError('Failed to update profile with new avatar.');
            console.error('Update error:', updateError);
        } else {
            showSuccess('Avatar updated successfully.');
            await refreshProfile();
        }

        setUploading(false);
    };

    return (
        <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} alt="User avatar" />
                <AvatarFallback>
                    <UserIcon className="h-10 w-10" />
                </AvatarFallback>
            </Avatar>
            <div>
                <Button asChild variant="outline" disabled={uploading}>
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Upload Avatar'}
                    </label>
                </Button>
                <input
                    id="avatar-upload"
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">PNG or JPG, max 2MB.</p>
            </div>
        </div>
    );
};

export default AvatarUploader;