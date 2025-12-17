"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface CustomerSelectorProps {
  onSelect: (customer: any) => void;
  selectedCustomer: any;
}

export function CustomerSelector({
  onSelect,
  selectedCustomer,
}: CustomerSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch customers on search
  const fetchCustomers = async (search: string = "") => {
    setLoading(true);
    try {
      const res = await api.get("/customer/customers/", { params: { search } });
      setCustomers(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSelect = (customer: any) => {
    onSelect(customer);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2">
              <span>{selectedCustomer.name}</span>
              {selectedCustomer.tier && (
                <Badge variant="secondary" className="text-xs h-5 px-1">
                  {selectedCustomer.tier}
                </Badge>
              )}
            </div>
          ) : (
            "Select customer..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search customer..."
            onValueChange={(val) => {
              setValue(val);
              fetchCustomers(val);
            }}
          />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup heading="Customers">
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id} // value needed for key navigation
                  onSelect={() => handleSelect(customer)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCustomer?.id === customer.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {customer.phone}
                    </span>
                  </div>
                  {customer.tier && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] h-4"
                    >
                      {customer.tier}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
