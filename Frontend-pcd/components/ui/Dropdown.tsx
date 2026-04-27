import { CircleHelp, Search } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type TVotacaoOption = {
  id: string;
  descricao: string;
  searchValue?: string;
};

type TVotacaoSelectProps = {
  options: TVotacaoOption[];
  value: string | null;
  onChange: (id: string | null) => void;

  label?: string;
  placeholder?: string;
  tooltip?: string | React.ReactNode;
  className?: string;
  inputClass?: string;

  required?: boolean;
  disabled?: boolean;
  hideSearch?: boolean;
  autoSetUnique?: boolean;

  isSkeletonLoading?: boolean;
  isFetching?: boolean;

  ariaLabel?: string;
  searchAriaLabel?: string;
  testId?: string;

  filter?: (value: string, search: string) => number;
};

function RightIcons({
  isMenuOpen,
  showClear,
  onClear,
  isLoading,
}: {
  isMenuOpen: boolean;
  showClear: boolean;
  onClear: () => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <svg
        className="animate-spin h-4 w-4 text-slate-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {showClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
          aria-label="Limpar seleção"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <svg
        className={cn(
          "h-4 w-4 text-slate-500 transition-transform duration-200",
          isMenuOpen && "rotate-180",
        )}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function TooltipIcon({ content }: { content: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="ml-1"
        aria-label="Mais informações"
      >
        <CircleHelp className="size-4 cursor-pointer text-primary" />
      </button>
      {show && (
        <div className="absolute left-6 top-0 z-50 w-56 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-200 shadow-lg">
          {content}
        </div>
      )}
    </span>
  );
}

const VotacaoSelect: React.FC<TVotacaoSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = "Selecione...",
  tooltip,
  className,
  inputClass,
  required = false,
  disabled = false,
  hideSearch = false,
  autoSetUnique = false,
  isSkeletonLoading = false,
  isFetching = false,
  ariaLabel,
  searchAriaLabel = "Digite para filtrar os itens da lista",
  testId = "votacaoSelect",
  filter,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [popoverWidth, setPopoverWidth] = useState("");
  const [screenReaderMsg, setScreenReaderMsg] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const loading = isFetching || options === null;

  useEffect(() => {
    const update = () => {
      if (triggerRef.current) {
        setPopoverWidth(`${triggerRef.current.offsetWidth}px`);
      }
    };
    update();

    window.addEventListener("resize", update);
    const obs = new ResizeObserver(update);
    if (triggerRef.current) obs.observe(triggerRef.current);

    return () => {
      window.removeEventListener("resize", update);
      if (triggerRef.current) obs.unobserve(triggerRef.current);
    };
  }, [options]);

  const handleOpenChange = (open: boolean) => {
    if (disabled || loading) return;
    setIsMenuOpen(open);
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleSelect = (id: string, descricao: string) => {
    onChange(id);
    setIsMenuOpen(false);
    setScreenReaderMsg(`Item selecionado: ${descricao}`);
  };

  const selectedOption = options?.find((o) => o.id === value);

  if (isSkeletonLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-[23px] w-1/2 max-w-full" />
        <Skeleton className="mt-2 h-[40px] w-full max-w-full lg:h-[42px]" />
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-500">*</span>}
          {tooltip && <TooltipIcon content={tooltip} />}
        </label>
      )}

      <div
        className={cn(
          "flex w-full flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-950 transition-colors",
          inputClass,
          (disabled || loading) && "cursor-not-allowed opacity-50",
        )}
      >
        <Popover open={isMenuOpen} onOpenChange={handleOpenChange} modal>
          <PopoverTrigger asChild>
            <Button
              data-testid={testId}
              ref={triggerRef}
              disabled={disabled || loading}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={isMenuOpen}
              aria-label={ariaLabel}
              className={cn(
                "flex min-h-10 w-full items-center justify-between gap-2",
                "whitespace-normal text-wrap break-words",
                "border-none bg-transparent px-3 py-2.5 text-left text-sm",
                "ring-2 ring-transparent",
                "hover:bg-transparent hover:ring-slate-600 hover:text-inherit",
                "focus-visible:ring-offset-0 focus-visible:ring-slate-500",
              )}
            >
              <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />

              {selectedOption ? (
                <span className="flex-1 truncate text-slate-200">
                  {selectedOption.descricao.length > 68
                    ? selectedOption.descricao.slice(0, 68) + "…"
                    : selectedOption.descricao}
                </span>
              ) : (
                <span className="flex-1 truncate text-slate-500">
                  {placeholder}
                </span>
              )}

              <RightIcons
                isMenuOpen={isMenuOpen}
                showClear={
                  value !== null && value !== undefined && value !== ""
                }
                onClear={handleClear}
                isLoading={loading}
              />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="max-w-full p-0 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl"
            style={{ width: popoverWidth }}
            data-testid="votacaoDropdown"
          >
            <Command filter={filter} className="bg-transparent text-white">
              {!hideSearch && (
                <CommandInput
                  placeholder="Filtrar votações…"
                  autoFocus
                  aria-label={searchAriaLabel}
                  role="search"
                  className="text-slate-200 placeholder:text-slate-500"
                  data-testid="votacaoSearchInput"
                />
              )}

              <CommandList className="max-h-[280px]">
                <CommandEmpty className="px-4 py-8 text-center text-slate-500 text-sm">
                  Nenhuma votação encontrada
                </CommandEmpty>

                <CommandGroup>
                  {options?.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={
                        option.searchValue
                          ? option.descricao + option.searchValue
                          : option.descricao
                      }
                      onSelect={() => handleSelect(option.id, option.descricao)}
                      className={cn(
                        "py-2.5 text-sm border-b border-slate-800 last:border-none",
                        "text-slate-400 hover:text-slate-200",
                        option.id === value &&
                          "bg-slate-900 text-white border-l-2 border-blue-500",
                      )}
                    >
                      {option.descricao}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div aria-live="polite" className="sr-only">
        {screenReaderMsg}
      </div>
    </div>
  );
};

export { VotacaoSelect };

/* ─────────────────────────────────────────────────────────────────────────────

  const [votacaoId, setVotacaoId] = useState<string | null>(null);
FEATURE
  <VotacaoSelect
    label="Votação"
    required
    options={votacoes}                  // TVotacaoOption[]  { id, descricao }a
    value={votacaoId}
    onChange={setVotacaoId}             // (id: string | null) => void
    placeholder="Selecione uma votação…"
    tooltip="Escolha a votação correspondente ao processo."
    isSkeletonLoading={isLoading}
    isFetching={isFetchingOptions}      // mostra spinner, bloqueia interação
    autoSetUnique                       // seleciona automaticamente se só 1 opção
  />
───────────────────────────────────────────────────────────────────────────── */
