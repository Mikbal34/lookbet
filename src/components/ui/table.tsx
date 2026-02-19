"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Usage:
// <Table>
//   <TableHeader>
//     <TableRow>
//       <TableHead>Guest</TableHead>
//       <TableHead>Room</TableHead>
//       <TableHead className="text-right">Price</TableHead>
//     </TableRow>
//   </TableHeader>
//   <TableBody>
//     {bookings.map((b) => (
//       <TableRow key={b.id}>
//         <TableCell>{b.guestName}</TableCell>
//         <TableCell>{b.room}</TableCell>
//         <TableCell className="text-right">${b.price}</TableCell>
//       </TableRow>
//     ))}
//   </TableBody>
// </Table>

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-gray-50 border-b border-gray-200", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-gray-100 bg-white", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "transition-colors hover:bg-gray-50/60",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500",
      "first:pl-6 last:pr-6",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3.5 text-sm text-gray-700 align-middle",
      "first:pl-6 last:pr-6",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";
