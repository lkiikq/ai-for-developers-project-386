// Общий блок ошибки загрузки данных (см. README, «Состояния и флоу»):
// текст дословно + кнопка «Повторить», вызывающая onRetry
const LoadError = ({ onRetry }) => (
  <>
    <p className="message error">
      Не удалось загрузить данные. Проверьте соединение и попробуйте снова.
    </p>
    <button type="button" className="button" onClick={onRetry}>
      Повторить
    </button>
  </>
);

export default LoadError;
