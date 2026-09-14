import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, GraduationCap, Briefcase, BookOpen, Award, TrendingUp } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { label: "LGAs Covered", value: "27", icon: TrendingUp },
  { label: "Registered Citizens", value: "50K+", icon: Users },
  { label: "Jobs Posted", value: "2,500+", icon: Briefcase },
  { label: "Courses Available", value: "300+", icon: BookOpen },
];

const features = [
  {
    icon: Users,
    title: "Citizen Database",
    description: "Comprehensive profiling of students, graduates, professionals, and artisans across all 27 LGAs.",
  },
  {
    icon: Briefcase,
    title: "Job Directory",
    description: "Smart job matching with internal recruitment, CBT examinations, and video interviews.",
  },
  {
    icon: GraduationCap,
    title: "Mentorship Program",
    description: "Connect with Trailblazers — experienced professionals guiding the next generation.",
  },
  {
    icon: BookOpen,
    title: "E-Learning Platform",
    description: "Courses, certifications, and skill development programs for career advancement.",
  },
  {
    icon: Award,
    title: "CV Builder",
    description: "Generate professional CVs from your profile data or upload your existing resume.",
  },
  {
    icon: TrendingUp,
    title: "Advanced Analytics",
    description: "Dynamic reports on human capital distribution by LGA, qualification, sector, and more.",
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-hero-gradient opacity-85" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/30 rounded-full px-4 py-1.5 mb-6">
              <span className="text-sm font-medium text-secondary">🇳🇬 Jigawa State Initiative</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
              Connecting Jigawa's
              <span className="block text-secondary"> Human Capital</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto font-body">
              A unified platform for career development, mentorship, job placement, 
              and skills acquisition across all 27 Local Government Areas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">Register Now</Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/jobs-board">Browse Jobs</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative -mt-16 z-20">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl shadow-elevated p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <stat.icon className="h-6 w-6 text-secondary mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to <span className="text-primary">Succeed</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From registration to recruitment, mentorship to certification — J-Connect 
              is the complete ecosystem for Jigawa's workforce.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="group bg-card rounded-xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/20"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-light flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-hero-gradient">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Join J-Connect?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Register today and become part of Jigawa State's largest professional network.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">Create Your Profile</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
