"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { qualityApi } from "@/lib/api/quality";
import { handleApiError, handleApiSuccess } from "@/lib/api-handler";
import { Loader2, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z
  .object({
    status: z.enum(["PASSED", "REJECTED", "REWORK"]),
    defect_category: z.string().optional(),
    notes: z.string().optional(),
    photo_url: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && !data.defect_category) {
        return false;
      }
      return true;
    },
    {
      message: "Defect category is required for rejected units",
      path: ["defect_category"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface QCInspectionDialogProps {
  inspectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QCInspectionDialog({
  inspectionId,
  open,
  onOpenChange,
  onSuccess,
}: QCInspectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      status: "PASSED",
      notes: "",
    },
  });

  const watchStatus = form.watch("status");

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const data = await qualityApi.getDefectCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch categories");
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      await qualityApi.updateInspectionStatus(
        Number(inspectionId),
        values.status,
        values.notes,
        values.status !== "PASSED" ? values.defect_category : undefined
      );

      // 2. If rejected and photo_url is provided, create the photo record
      if (values.status === "REJECTED" && values.photo_url) {
        await qualityApi.createPhoto({
          inspection: inspectionId,
          photo_url: values.photo_url,
          caption: "Unit Defect Evidence",
        });
      }

      handleApiSuccess("Quality Inspection Completed");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      handleApiError(error, form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Perform Quality Inspection</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PASSED" className="text-green-600">
                        <div className="flex items-center">
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Passed
                        </div>
                      </SelectItem>
                      <SelectItem value="REJECTED" className="text-red-600">
                        <div className="flex items-center">
                          <AlertCircle className="mr-2 h-4 w-4" /> Rejected
                        </div>
                      </SelectItem>
                      <SelectItem value="REWORK" className="text-yellow-600">
                        Rework Requested
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchStatus === "REJECTED" && (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Defect Evidence Required</AlertTitle>
                  <AlertDescription>
                    Please categorize the defect and upload a photo for the
                    rework team.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="defect_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Defect Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="What went wrong?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo Evidence (URL)</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="https://cloud.storage/defect.jpg"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setPhotoPreview(e.target.value);
                            }}
                          />
                          <Button type="button" variant="secondary" size="icon">
                            <Camera className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Mandatory visual proof for defect tracking.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {photoPreview && (
                  <div className="mt-2 rounded-lg border overflow-hidden bg-muted aspect-video flex items-center justify-center">
                    <img
                      src={photoPreview}
                      alt="Defect Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={() => setPhotoPreview(null)}
                    />
                  </div>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspector's Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Details for the production / rework team..."
                      className="min-h-25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={
                  watchStatus === "PASSED"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Inspection
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
