export interface PropsEditorProps {
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}
