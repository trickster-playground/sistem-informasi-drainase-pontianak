// components/KecamatanFilter.tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  value: string;
  options: string[];
  onChange: (kecamatan: string) => void;
};

export default function KecamatanFilter({ value, options, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-col lg:flex-row items-center gap-2 mx-4 relative z-[999]">
      <label htmlFor="kecamatan" className="mr-3 font-medium">
        Filter Kecamatan:
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Pilih Kecamatan" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Pilih Kecamatan</SelectLabel>
            <SelectItem value="all">Semua Kecamatan</SelectItem>
            {options.map((kec) => (
              <SelectItem key={kec} value={kec}>
                {kec}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
