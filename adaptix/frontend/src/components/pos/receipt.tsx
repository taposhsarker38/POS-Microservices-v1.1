"use client";

import React, { forwardRef } from "react";

interface ReceiptProps {
  data: {
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    orderNumber: string;
    date: string;
    cashier?: string;
    customer?: string;
    items: Array<{
      name: string;
      qty: number;
      price: number;
      total: number;
      isTaxExempt?: boolean;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    change?: number;
    paidAmount?: number;
    balanceDue?: number;
  };
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-4 text-xs font-mono leading-tight max-w-[80mm] mx-auto print:max-w-full"
        style={{ width: "100%", maxWidth: "80mm" }}
      >
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold uppercase mb-1">
            {data.storeName || "Adaptix POS"}
          </h1>
          <p>{data.storeAddress || "123 Business St, City"}</p>
          <p>Tel: {data.storePhone || "123-456-7890"}</p>
        </div>

        <div className="mb-4 border-b border-dashed border-black pb-2">
          <p>Order: {data.orderNumber}</p>
          <p>Date: {data.date}</p>
          <p>Cashier: {data.cashier || "Admin"}</p>
          <p>Customer: {data.customer || "Guest"}</p>
        </div>

        <div className="mb-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-1 pr-1 truncate max-w-[100px]">
                    {item.name}
                    {item.isTaxExempt && (
                      <span className="block text-[8px] font-bold text-slate-500">
                        *TAX FREE*
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-right">{item.qty}</td>
                  <td className="py-1 text-right">{item.price.toFixed(2)}</td>
                  <td className="py-1 text-right">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-dashed border-black pt-2 mb-4 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{data.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{data.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{data.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-black">
            <span>Total:</span>
            <span>{data.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-4 text-center space-y-2 pt-2 border-t border-dashed border-black">
          <p className="uppercase font-bold">PAID BY {data.paymentMethod}</p>
          {data.paidAmount !== undefined && (
            <div className="flex justify-between px-2 text-sm">
              <span className="font-bold">TOTAL PAID:</span>
              <span className="font-bold">{data.paidAmount.toFixed(2)}</span>
            </div>
          )}
          {data.balanceDue !== undefined && data.balanceDue > 0 && (
            <div className="flex justify-between px-2 font-bold text-red-600">
              <span>BALANCE DUE:</span>
              <span>{data.balanceDue.toFixed(2)}</span>
            </div>
          )}
          {data.change !== undefined && data.change > 0 && (
            <div className="flex justify-between px-2 text-sm border-t border-black pt-1">
              <span className="font-bold">CHANGE RETURN:</span>
              <span className="font-bold">{data.change.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="text-center border-t border-black pt-2">
          <p className="font-bold">Thank you for your business!</p>
          <p className="text-[10px] mt-1">Powered by Adaptix</p>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
