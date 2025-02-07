"use client";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
} from "@tanstack/react-table";
import { Transaction, User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

type TransactionWithUser = Transaction & { user: User };

export default function TransactionsTable() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const fetchDataOptions = {
    pageIndex,
    pageSize,
  };

  const { data, isLoading, isError, refetch } =
    useTransactionData(fetchDataOptions);

  const defaultData = useMemo(() => [], []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize],
  );

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/transactions/${deletingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Transaction deleted successfully");
        refetch();
      } else {
        throw new Error("Failed to delete transaction");
      }
    } catch (error) {
      toast.error("Failed to delete transaction. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, refetch]);

  const columns = useMemo<ColumnDef<TransactionWithUser>[]>(
    () => [
      {
        accessorKey: "user.name",
        header: "User Name",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => `${row.original.currency} ${row.original.amount}`,
      },
      {
        accessorKey: "status",
        header: "Status",
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment Method",
      },
      {
        accessorKey: "creditAmount",
        header: "Credit Amount",
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="icon"
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash size={16} />
          </Button>
        ),
      },
    ],
    [handleDelete],
  );

  const table = useReactTable({
    data: data?.transactions ?? defaultData,
    columns,
    pageCount: data?.pageCount ?? -1,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading transactions</div>;
  }

  return (
    <div className="space-y-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-6 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between">
        <Button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <span className="flex items-center gap-1">
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </strong>
        </span>
        <Button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function useTransactionData(options: { pageIndex: number; pageSize: number }) {
  const [data, setData] = useState<{
    transactions: TransactionWithUser[];
    pageCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await fetch(
        `/api/transactions?page=${options.pageIndex + 1}&limit=${options.pageSize}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [options.pageIndex, options.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isError, refetch: fetchData };
}
