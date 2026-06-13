import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { MapPin, Edit, X, Plus, Minus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface IncomingOrdersPanelProps {
  orders: any[];
  loading: boolean;
  editingOrderId: any;
  editingItems: any[];
  menuItems: any[];
  formatCurrency: (val: any) => string;
  onStartEditing: (order: any) => void;
  onCancelEditing: () => void;
  onUpdateItemQuantity: (index: number, qty: any) => void;
  onRemoveItem: (index: number) => void;
  onAddMenuItem: (menuItem: any) => void;
  onSaveChanges: () => void;
  onStartPreparing: (orderId: any) => void;
}

export const IncomingOrdersPanel: React.FC<IncomingOrdersPanelProps> = ({
  orders,
  loading,
  editingOrderId,
  editingItems,
  menuItems,
  formatCurrency,
  onStartEditing,
  onCancelEditing,
  onUpdateItemQuantity,
  onRemoveItem,
  onAddMenuItem,
  onSaveChanges,
  onStartPreparing
}) => {
  if (loading) {
    return (
      <Card className="flex flex-col h-[650px] overflow-hidden border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="pt-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full mb-4 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[650px] overflow-hidden border shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-muted/20">
        <div>
          <CardTitle className="text-xs uppercase font-extrabold tracking-wide">Incoming Recipes</CardTitle>
          <CardDescription className="text-[10px] font-semibold mt-0.5">Awaiting chef stove slots</CardDescription>
        </div>
        <Badge variant="info" className="text-[10px] font-bold py-0.5 px-2 border-none">
          {orders.length} New
        </Badge>
      </CardHeader>
      <CardContent className="pt-4 overflow-y-auto flex-1 space-y-3">
        {orders.map((order: any) => (
          <div key={order.id} className="border bg-info/5 border-info/30/50 dark:border-blue-900/50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-info" />
                <span className="font-extrabold text-xs">{order.order_type_label || (order.table_number ? `Table ${order.table_number}` : 'Take Away')}</span>
                <span className="text-[9px] text-muted-foreground font-semibold">#{uuidToDisplayId(order.id)}</span>
              </div>
              <span className="text-xs font-extrabold text-info">
                {formatCurrency(order.total_amount)}
              </span>
            </div>

            {editingOrderId === order.id ? (
              <div className="space-y-3 p-2.5 border bg-background rounded-xl">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Modify recipe items</Label>
                  <Button variant="ghost" size="icon" onClick={onCancelEditing} className="h-6 w-6"><X className="w-3.5 h-3.5" /></Button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(editingItems || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-1 text-[10px] gap-2">
                      <div className="truncate flex-1 font-semibold">
                        <span className="font-extrabold text-foreground">{item.menu_item_name}</span>
                        <span className="text-[9px] text-muted-foreground block">{formatCurrency(item.unit_price)} each</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="icon" variant="outline" className="w-5 h-5 rounded-md" onClick={() => onUpdateItemQuantity(idx, item.quantity - 1)}><Minus className="w-2.5 h-2.5" /></Button>
                        <span className="w-4 text-center font-extrabold">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="w-5 h-5 rounded-md" onClick={() => onUpdateItemQuantity(idx, item.quantity + 1)}><Plus className="w-2.5 h-2.5" /></Button>
                        <Button size="icon" variant="destructive" className="w-5 h-5 rounded-md" onClick={() => onRemoveItem(idx)}><X className="w-2.5 h-2.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground">Tap Food to Add:</Label>
                  <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto pr-1">
                    {menuItems.map((menuItem) => (
                      <Button
                        key={menuItem.id}
                        variant="outline"
                        className="h-auto p-1.5 justify-start text-[9px] flex-col items-start gap-0.5 rounded-lg text-left"
                        onClick={() => onAddMenuItem(menuItem)}
                      >
                        <span className="truncate w-full font-bold text-foreground">{menuItem.name}</span>
                        <span className="text-[8px] text-muted-foreground">{formatCurrency(menuItem.price)}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-[10px] font-extrabold">
                  <span>Total: {formatCurrency((editingItems || []).reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0))}</span>
                  <Button size="sm" className="h-7 text-[10px] font-bold" onClick={onSaveChanges}><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
              </div>
            ) : (
              order.items && order.items.length > 0 && (
                <div className="space-y-1.5 bg-background border p-2 rounded-xl">
                  {order.items.map((item: any, idx: number) => {
                    const menuItem = (menuItems || []).find(mi => mi.id === item.menu_item_id);
                    const imageUrl = menuItem && menuItem.image_url;
                    return (
                      <div key={idx} className="flex items-center gap-2 border-b pb-1 last:border-none last:pb-0 text-xs">
                        {imageUrl && <img src={imageUrl} alt={item.menu_item_name} className="w-7 h-7 rounded object-cover border" />}
                        <div className="flex-1 min-w-0 font-semibold text-muted-foreground">
                          <span className="font-extrabold text-foreground">{item.quantity}x</span> {item.menu_item_name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            <div className="flex items-center justify-between text-[9px] pt-1">
              <span className="text-muted-foreground font-semibold">
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              <div className="flex items-center gap-1.5">
                {editingOrderId !== order.id && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => onStartEditing(order)}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                )}
                <Button size="sm" className="h-7 text-[10px] font-bold" disabled={editingOrderId === order.id} onClick={() => onStartPreparing(order.id)}>
                  Start Prep
                </Button>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="p-10 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No incoming recipes streaming
          </div>
        )}
      </CardContent>
    </Card>
  );
};
