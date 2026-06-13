import { uuidToDisplayId } from "@/lib/utils";
import React from 'react';
import { MapPin, Plus, Minus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface PreparingOrdersPanelProps {
  orders: any[];
  loading: boolean;
  addingItemsOrderId: any;
  addingItems: any[];
  menuItems: any[];
  formatCurrency: (val: any) => string;
  onStartAddingItems: (order: any) => void;
  onCancelAddingItems: () => void;
  onAddMenuItem: (menuItem: any) => void;
  onUpdateAddingQuantity: (index: number, qty: any) => void;
  onRemoveAddingItem: (index: number) => void;
  onSaveAddedItems: () => void;
  onMarkOrderReady: (orderId: any) => void;
}

export const PreparingOrdersPanel: React.FC<PreparingOrdersPanelProps> = ({
  orders,
  loading,
  addingItemsOrderId,
  addingItems,
  menuItems,
  formatCurrency,
  onStartAddingItems,
  onCancelAddingItems,
  onAddMenuItem,
  onUpdateAddingQuantity,
  onRemoveAddingItem,
  onSaveAddedItems,
  onMarkOrderReady
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
          <CardTitle className="text-xs uppercase font-extrabold tracking-wide">Stoves & Ovens</CardTitle>
          <CardDescription className="text-[10px] font-semibold mt-0.5">Cooking recipes under flame</CardDescription>
        </div>
        <Badge variant="warning" className="text-[10px] font-bold py-0.5 px-2 border-none">
          {orders.length} Cooking
        </Badge>
      </CardHeader>
      <CardContent className="pt-4 overflow-y-auto flex-1 space-y-3">
        {orders.map((order: any) => (
          <div key={order.id} className="border bg-warning/5 border-warning/30/50 dark:border-yellow-900/50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-warning" />
                <span className="font-extrabold text-xs">{order.order_type_label || (order.table_number ? `Table ${order.table_number}` : 'Take Away')}</span>
                <span className="text-[9px] text-muted-foreground font-semibold">#{uuidToDisplayId(order.id)}</span>
              </div>
              <span className="text-xs font-extrabold text-warning">
                {formatCurrency(order.total_amount)}
              </span>
            </div>

            {order.items && order.items.length > 0 && (
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
            )}

            {addingItemsOrderId === order.id ? (
              <div className="space-y-3 p-2.5 border bg-background rounded-xl">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Add Recipe Quantities</Label>
                  <Button variant="ghost" size="icon" onClick={onCancelAddingItems} className="h-6 w-6"><X className="w-3.5 h-3.5" /></Button>
                </div>

                {addingItems.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {addingItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-1 text-[10px] gap-2 font-semibold">
                        <div className="truncate flex-1">
                          <span className="font-extrabold text-foreground">{item.menu_item_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="icon" variant="outline" className="w-5 h-5 rounded-md" onClick={() => onUpdateAddingQuantity(idx, item.quantity - 1)}><Minus className="w-2.5 h-2.5" /></Button>
                          <span className="w-4 text-center font-extrabold">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="w-5 h-5 rounded-md" onClick={() => onUpdateAddingQuantity(idx, item.quantity + 1)}><Plus className="w-2.5 h-2.5" /></Button>
                          <Button size="icon" variant="destructive" className="w-5 h-5 rounded-md" onClick={() => onRemoveAddingItem(idx)}><X className="w-2.5 h-2.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
                  <span>Additional: {formatCurrency(addingItems.reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0))}</span>
                  <Button size="sm" className="h-7 text-[10px] font-bold" disabled={addingItems.length === 0} onClick={onSaveAddedItems}><Save className="w-3 h-3 mr-1" /> Add</Button>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-[9px] pt-1">
              <span className="text-muted-foreground font-semibold">
                Stove: {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              <div className="flex items-center gap-1.5">
                {addingItemsOrderId !== order.id && (
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => onStartAddingItems(order)}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                )}
                <Button size="sm" className="h-7 text-[10px] font-bold bg-warning hover:bg-yellow-700 text-white border-none" disabled={addingItemsOrderId === order.id} onClick={() => onMarkOrderReady(order.id)}>
                  Finish
                </Button>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="p-10 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            Stoves are cold, no dishes boiling
          </div>
        )}
      </CardContent>
    </Card>
  );
};
