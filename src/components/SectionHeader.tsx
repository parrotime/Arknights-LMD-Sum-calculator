import styles from "../assets/styles/SectionHeader.module.css";

interface SectionHeaderProps {
  title: string;
  code: string;
  note?: string;
  className?: string;
}

const SectionHeader = ({ title, code, note, className = "" }: SectionHeaderProps) => (
  <div className={`${styles.header} ${className}`}>
    <span className={styles.main}>{title}</span>
    {note && <span className={styles.note}>{note}</span>}
    <span className={styles.code}>{code}</span>
  </div>
);

export default SectionHeader;
