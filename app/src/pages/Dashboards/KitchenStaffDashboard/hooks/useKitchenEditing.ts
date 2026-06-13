import { useState } from "react";
import api from "@/application";
import toast from "react-hot-toast";

export const useKitchenEditing = (onDataRefresh: () => Promise<void>) => {
  const [editingOrderId, setEditingOrderId] = useState<any>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [addingItemsOrderId, setAddingItemsOrderId] = useState<any>(null);
  const [addingItems, setAddingItems] = useState<any[]>([]);

  // Editing helpers
  const startEditingOrder = (order: any) => {
    setEditingOrderId(order.id);
    const normalizedItems = (order.items || []).map((item: any) => ({
      ...item,
      quantity: parseInt(item.quantity || 1),
      unit_price: parseFloat(item.unit_price || 0),
      subtotal: parseFloat(item.subtotal || 0),
      menu_item_id: item.menu_item_id,
    }));
    setEditingItems(normalizedItems);
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setEditingItems([]);
  };

  const updateItemQuantity = (index: number, newQuantity: any) => {
    if (newQuantity < 1) return;
    const updatedItems = [...editingItems];
    updatedItems[index].quantity = parseInt(newQuantity);
    updatedItems[index].subtotal =
      parseFloat(updatedItems[index].unit_price || 0) * parseInt(newQuantity);
    setEditingItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = editingItems.filter((_, i) => i !== index);
    setEditingItems(updatedItems);
  };

  const addMenuItem = (menuItem: any) => {
    const existingItemIndex = editingItems.findIndex(
      (item: any) => item.menu_item_id === menuItem.id,
    );
    if (existingItemIndex >= 0) {
      updateItemQuantity(
        existingItemIndex,
        editingItems[existingItemIndex].quantity + 1,
      );
    } else {
      const price = parseFloat(menuItem.price || 0);
      const newItem = {
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        quantity: 1,
        unit_price: price,
        subtotal: price,
      };
      setEditingItems([...editingItems, newItem]);
    }
  };

  const saveOrderChanges = async (orderId: any, userId?: string | number) => {
    try {
      const itemsData = {
        items: editingItems.map((item: any) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        updated_by: userId,
      };

      await api.orders.updateItems(orderId, itemsData);
      toast.success("Order items updated successfully!");
      await onDataRefresh();
      cancelEditing();
      return true;
    } catch (error) {
      console.error("Error updating order items:", error);
      toast.error("Failed to update order items");
      return false;
    }
  };

  // Adding items helpers
  const startAddingItems = (order: any) => {
    setAddingItemsOrderId(order.id);
    setAddingItems([]);
  };

  const cancelAddingItems = () => {
    setAddingItemsOrderId(null);
    setAddingItems([]);
  };

  const addMenuItemToPreparing = (menuItem: any) => {
    const existingItemIndex = addingItems.findIndex(
      (item: any) => item.menu_item_id === menuItem.id,
    );
    if (existingItemIndex >= 0) {
      const updatedItems = [...addingItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].subtotal =
        parseFloat(updatedItems[existingItemIndex].unit_price) *
        updatedItems[existingItemIndex].quantity;
      setAddingItems(updatedItems);
    } else {
      const price = parseFloat(menuItem.price || 0);
      const newItem = {
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        quantity: 1,
        unit_price: price,
        subtotal: price,
      };
      setAddingItems([...addingItems, newItem]);
    }
  };

  const updateAddingItemQuantity = (index: number, newQuantity: any) => {
    if (newQuantity < 1) return;
    const updatedItems = [...addingItems];
    updatedItems[index].quantity = parseInt(newQuantity);
    updatedItems[index].subtotal =
      parseFloat(updatedItems[index].unit_price || 0) * parseInt(newQuantity);
    setAddingItems(updatedItems);
  };

  const removeAddingItem = (index: number) => {
    const updatedItems = addingItems.filter((_, i) => i !== index);
    setAddingItems(updatedItems);
  };

  const saveAddedItems = async (orderId: any, userId?: string | number) => {
    try {
      if (addingItems.length === 0) {
        toast.error("Please add at least one item");
        return false;
      }

      const itemsData = {
        items: addingItems.map((item: any) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        updated_by: userId,
      };

      await api.orders.addItems(orderId, itemsData);
      toast.success("Items added to order successfully!");
      await onDataRefresh();
      cancelAddingItems();
      return true;
    } catch (error) {
      console.error("Error adding items to order:", error);
      toast.error("Failed to add items to order");
      return false;
    }
  };

  return {
    // Editing state
    editingOrderId,
    editingItems,
    startEditingOrder,
    cancelEditing,
    updateItemQuantity,
    removeItem,
    addMenuItem,
    saveOrderChanges,
    // Adding state
    addingItemsOrderId,
    addingItems,
    startAddingItems,
    cancelAddingItems,
    addMenuItemToPreparing,
    updateAddingItemQuantity,
    removeAddingItem,
    saveAddedItems,
  };
};
