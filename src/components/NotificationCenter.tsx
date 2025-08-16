import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
    id: string;
    created_at: string;
    message: string;
    is_read: boolean;
};

export const NotificationCenter = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error("Error fetching notifications:", error);
        } else {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('realtime-notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        if (open && unreadCount > 0) {
            if (!user) return;
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            
            if (!error) {
                setUnreadCount(0);
            }
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <div className="p-4">
                    <h4 className="font-medium leading-none">Notifications</h4>
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                            <div key={notification.id}>
                                <div className="p-4 text-sm">
                                    <p>{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                                {index < notifications.length - 1 && <Separator />}
                            </div>
                        ))
                    ) : (
                        <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};