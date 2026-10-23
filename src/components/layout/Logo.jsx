import logo from '../../assets/images/logo.webp';

export default function Logo({ className = '', ...props }) {
  return <img className={`logo ${className}`.trim()} src={logo} alt="Chasing 606" width="560" height="606" decoding="async" {...props} />;
}
