import { useState, useEffect, useRef, use } from "react";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/solid";

export default function TextInput({
  isResponding,
  onSubmit,
  onStop,
  onHeightChange,
  initialInput = "",
  disabled = false,
  placeholder = "Message",
}: {
  isResponding: boolean;
  onSubmit: (input: string) => void;
  onStop: () => void;
  onHeightChange: (newHeight: number) => void;
  initialInput?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [input, setInput] = useState<string>(initialInput);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [textareaHeight, setTextareaHeight] = useState<number>(80);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // handle input change
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    const maxHeight = window.innerHeight * 0.4;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    if (newHeight !== textareaHeight) {
      setTextareaHeight(newHeight);
      onHeightChange(newHeight);
    }
  }, [input]);

  // handle button design
  useEffect(() => {
    if (!isResponding) {
      setIsSubmitted(false);
    }
  }, [isResponding]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        event.preventDefault();
        setInput((prev) => prev + "\n");
      } else {
        event.preventDefault();
        handleSubmit();
      }
    }
  }

  function handleSubmit() {
    if (!isResponding) {
      setIsSubmitted(true);
      onSubmit(input);
      setInput("");
    } else {
      setIsSubmitted(false);
      onStop();
    }
  }

  return (
    <div className="relative bg-secondary dark:bg-secondary-dark rounded-s-2xl rounded-e-2xl w-full drop-shadow-lg border border-gray-200/10 ">
      <div className="flex items-center gap-2 pt-2 pb-2 opacity-70">
        <textarea
          ref={textareaRef}
          disabled={disabled}
          className="flex-1 caret-blue-500 bg-transparent rounded-lg p-4 pr-12 text-textPrimary dark:text-textPrimary-dark outline-none resize-none transition-all duration-200 ease-in-out"
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ height: textareaHeight }}
        />
        <div className="absolute bottom-2 right-2 aspect-square rounded-full drop-shadow-lg">
          <button
            onClick={handleSubmit}
            className="absolute bottom-2 right-2 bg-gray-100 hover:scale-125 transform transition-transform duration-500 text-gray-900 p-1 aspect-square rounded-full drop-shadow-lg"
          >
            <div
              className={`absolute inset-0 border-2 border-transparent border-t-gray-600 border-l-gray-600 rounded-full transition-opacity duration-[700ms] ease-out ${
                isSubmitted ? "opacity-80 animate-spin-slow" : "opacity-0"
              }`}
            />
            <div className="relative w-5 h-5">
              <PaperAirplaneIcon
                className={`absolute left-[1px] inset-0 transition-opacity duration-[1500ms] ease-out ${
                  !isResponding ? "opacity-100" : "opacity-0"
                }`}
              />
              <StopIcon
                className={`absolute inset-0 transition-opacity duration-[700ms] ease-out ${
                  isResponding ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
