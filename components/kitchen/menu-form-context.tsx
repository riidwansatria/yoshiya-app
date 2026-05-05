'use client';

import { createContext, useContext, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MenuFormContext = createContext<{
    isSubmitting: boolean;
    setIsSubmitting: (v: boolean) => void;
}>({ isSubmitting: false, setIsSubmitting: () => {} });

export function MenuFormProvider({ children }: { children: React.ReactNode }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    return (
        <MenuFormContext.Provider value={{ isSubmitting, setIsSubmitting }}>
            {children}
        </MenuFormContext.Provider>
    );
}

export function useMenuFormContext() {
    return useContext(MenuFormContext);
}

export function MenuFormSubmitButton({ children }: { children: React.ReactNode }) {
    const { isSubmitting } = useMenuFormContext();
    return (
        <Button type="submit" form="menu-form" size="sm" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </Button>
    );
}
