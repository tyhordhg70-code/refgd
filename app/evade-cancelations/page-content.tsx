"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";
import Image from "next/image";
import AnimatedParticleBackground from "@/components/AnimatedParticleBackground";
import MagneticButton from "@/components/MagneticButton";

/**
 * Scroll-reveal 3D animation wrapper with parallax rotation
 */
function ScrollReveal({
  children,
  delay = 0,
  perspective = true,
}: {
  children: ReactNode;
  delay?: number;
  perspective?: boolean;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.15"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [80, 0, -20]);
  const rotateX = useTransform(scrollYProgress, [0, 0.3, 1], [20, 0, -10]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.98]);

  return (
    <motion.div
      ref={ref}
      style={
        perspective
          ? { opacity, y, rotateX, scale, perspective: "1200px" }
          : { opacity, y }
      }
      transition={{ delay, duration: 0.8 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hero section with YouTube embed and parallax background
 */
function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section
      ref={ref}
      className="relative min-h-[120vh] w-full overflow-hidden pt-32"
    >
      <motion.div style={{ y, opacity, scale }} className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/15 via-transparent to-transparent" />
      </motion.div>

      <div className="container-px relative z-10 flex flex-col items-center justify-center gap-16 py-20">
        <ScrollReveal>
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/80"
              >
                // The Journey Begins
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-5xl font-bold text-white sm:text-7xl"
              >
                Experience Online Freedom
              </motion.h1>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mx-auto max-w-2xl text-lg leading-relaxed text-white/85"
            >
              Say goodbye to order cancelations, bans, rebills, and failed
              refunds. This is the knowledge you&apos;ve been searching for.
            </motion.p>
          </div>
        </ScrollReveal>

        {/* YouTube Embed */}
        <ScrollReveal delay={0.2} perspective={true}>
          <motion.div className="w-full max-w-4xl px-4 sm:px-0">
            <motion.div
              whileHover={{ scale: 1.02, rotateY: 5 }}
              className="overflow-hidden rounded-2xl border border-cyan-400/20 shadow-2xl"
              style={{
                perspective: "1000px",
                background:
                  "linear-gradient(135deg, rgba(15,20,40,0.6), rgba(20,30,60,0.4))",
                backdropFilter: "blur(8px)",
                boxShadow: "0 25px 60px rgba(34,211,238,0.2)",
              }}
            >
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  className="absolute inset-0 h-full w-full border-0"
                  src="https://www.youtube.com/embed/9ga4vZFpB6E?autoplay=1&mute=1&rel=0&modestbranding=1"
                  title="RefundGod Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/**
 * Story section with flowing narrative and 3D card effect
 */
function StorySection({
  title,
  subtitle,
  body,
  bgImage,
  reverse = false,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  body: string | string[];
  bgImage?: string;
  reverse?: boolean;
  delay?: number;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "center 0.3"],
  });

  const rotateY = useTransform(scrollYProgress, [0, 1], [-15, 15]);
  const z = useTransform(scrollYProgress, [0, 1], [-100, 100]);

  return (
    <ScrollReveal delay={delay}>
      <section ref={ref} className="relative py-20 sm:py-32">
        <div className="container-px">
          <div className={`grid gap-12 lg:grid-cols-2 lg:items-center`}>
            <motion.div
              className={reverse ? "order-2 lg:order-1" : ""}
              style={{ perspective: "1200px" }}
            >
              <div className="space-y-6">
                {subtitle && (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                    // {subtitle}
                  </p>
                )}
                <h2 className="text-4xl font-bold text-white sm:text-5xl">
                  {title}
                </h2>
                <div className="space-y-4 text-base leading-relaxed text-white/80 sm:text-lg">
                  {Array.isArray(body) ? (
                    body.map((p, i) => <p key={i}>{p}</p>)
                  ) : (
                    <p>{body}</p>
                  )}
                </div>
              </div>
            </motion.div>
            <motion.div
              className={`${reverse ? "order-1 lg:order-2" : ""}`}
              style={{
                perspective: "1200px",
                rotateY,
                z,
              }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="group relative overflow-hidden rounded-2xl border border-cyan-400/10 aspect-square"
                style={{
                  background: bgImage
                    ? `url(${bgImage})`
                    : "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(34,211,238,0.03))",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                {!bgImage && (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/10" />
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

/**
 * 3D Animated feature card grid
 */
function FeatureGrid({
  title,
  features,
}: {
  title: string;
  features: Array<{ name: string; desc: string }>;
}) {
  return (
    <ScrollReveal>
      <section className="relative py-20 sm:py-32">
        <div className="container-px">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-white sm:text-5xl">
              {title}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 60, rotateX: 20 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{
                  y: -12,
                  rotateX: -5,
                  rotateY: 5,
                  scale: 1.03,
                }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                className="group relative overflow-hidden rounded-xl border border-cyan-400/10 p-6 sm:p-8 transition-all hover:border-cyan-400/30 hover:shadow-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(34,211,238,0.03))",
                  backdropFilter: "blur(4px)",
                  perspective: "1000px",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/15 group-hover:to-cyan-500/8 transition-all"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                />
                <div className="relative space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-cyan-300">
                    {f.name}
                  </h3>
                  <p className="leading-relaxed text-sm sm:text-base text-white/75">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

/**
 * Pricing section with 3D card animations
 */
function PricingSection() {
  const pricing = [
    {
      title: "Stealth / OpSEC Guide + Rebill Bypass",
      desc: "Remain fully anonymous while surfing online, place orders under a forged identity, never face a rebill again.",
      url: "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
      image: "https://cdn.builder.io/api/v1/image/assets%2F3778a0c9db71438faed194af941d1b5e%2F9fce1073735d4ebc896447e2c860cd59?format=webp&width=400",
    },
    {
      title: "Evasion Book - Level 1",
      desc: "Hit big ordering from multiple accounts at once before the store detects you. 45 pages, no filler.",
      url: "https://refundgod.bgng.io/product/evade1",
      image: "https://cdn.builder.io/api/v1/image/assets%2F3778a0c9db71438faed194af941d1b5e%2F4da74830c41f4126999374ad117c750b?format=webp&width=400",
    },
    {
      title: "Evasion Book - Level 2",
      desc: "Quick solutions for beginners with free and paid alternatives. 10+ pages with lifetime support.",
      url: "https://refundgod.bgng.io/product/evasion-book---level-2",
      image: "https://cdn.builder.io/api/v1/image/assets%2F3778a0c9db71438faed194af941d1b5e%2F5efeed42a34c4c2880fa150e1eb63d9d?format=webp&width=400",
    },
  ];

  return (
    <ScrollReveal>
      <section className="relative py-20 sm:py-32">
        <div className="container-px">
          <div className="mb-16 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
              // Invest in Knowledge
            </p>
            <h2 className="text-4xl font-bold text-white sm:text-5xl">
              Choose Your Path
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 60, rotateX: 25 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{
                  y: -16,
                  rotateX: -8,
                  rotateY: 8,
                  scale: 1.05,
                }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 80 }}
                className="group relative overflow-hidden rounded-2xl border border-cyan-400/10 p-6 sm:p-8 transition-all hover:border-cyan-400/30 hover:shadow-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(34,211,238,0.04))",
                  backdropFilter: "blur(10px)",
                  perspective: "1000px",
                }}
              >
                <motion.div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/20 group-hover:to-cyan-500/10 transition-all" />

                <div className="relative space-y-6">
                  {p.image && (
                    <motion.div
                      className="relative h-40 w-full overflow-hidden rounded-lg"
                      whileHover={{ scale: 1.1 }}
                    >
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-cover opacity-80 mix-blend-screen"
                        style={{ filter: "brightness(1.2)" }}
                      />
                    </motion.div>
                  )}

                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {p.title}
                  </h3>
                  <p className="leading-relaxed text-sm sm:text-base text-white/80">
                    {p.desc}
                  </p>
                  <MagneticButton
                    href={p.url}
                    external
                    variant="primary"
                    className="w-full text-sm sm:text-base"
                  >
                    Get Started
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m12 5 7 7-7 7M5 12h14" />
                    </svg>
                  </MagneticButton>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

/**
 * Payment illustration section with centered image
 */
function PaymentSection() {
  return (
    <ScrollReveal>
      <section className="relative py-20 sm:py-32">
        <div className="container-px flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateZ: -10 }}
            whileInView={{ opacity: 1, scale: 1, rotateZ: 0 }}
            whileHover={{ scale: 1.08, rotateZ: 5 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100 }}
            className="relative max-w-lg"
            style={{ perspective: "1200px" }}
          >
            <motion.div
              className="overflow-hidden rounded-2xl border border-cyan-400/20"
              style={{
                background:
                  "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(34,211,238,0.03))",
                backdropFilter: "blur(8px)",
                boxShadow: "0 25px 60px rgba(34,211,238,0.15)",
              }}
            >
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F3778a0c9db71438faed194af941d1b5e%2F7ae35b86725b46b88ae25563e39ca50d?format=webp&width=600"
                alt="Payment and Success"
                className="w-full h-auto opacity-85 mix-blend-screen"
                style={{ filter: "brightness(1.15)" }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </ScrollReveal>
  );
}

/**
 * Main page content with enhanced 3D animations
 */
export default function PageContent() {
  return (
    <>
      <AnimatedParticleBackground />

      <main className="relative z-10">
        {/* Hero */}
        <HeroSection />

        {/* Core Knowledge */}
        <StorySection
          subtitle="The Foundation"
          title="Evade Like a Pro"
          bgImage="https://cdn.builder.io/api/v1/image/assets%2F3778a0c9db71438faed194af941d1b5e%2F50c55ed038194045953b01dbf16738b3?format=webp&width=600"
          body={[
            "Every store invests millions in anti-fraud systems. They assign you a fraud score at checkout. If it reaches a threshold, your order is cancelled — sometimes before it even ships.",
            "But there's a system to understand. A pattern to follow. A way to keep your score invisible.",
            "This is what separates the successful from the banned.",
          ]}
          delay={0.1}
        />

        {/* Solutions */}
        <FeatureGrid
          title="What You'll Master"
          features={[
            {
              name: "Seamless Account Transitions",
              desc: "Crank out new accounts without detection or linking. Whether suspended, blocked, or banned — learn the recovery.",
            },
            {
              name: "Step-by-Step Procedures",
              desc: "The real value isn't in creating accounts. It's in maintaining their longevity without triggering algorithms.",
            },
            {
              name: "Comprehensive Strategies",
              desc: "Lifetime updates, anonymity techniques, multi-account safety, selling automation, and account-linking prevention.",
            },
            {
              name: "Anonymous Credit Lines",
              desc: "Obtain credit lines up to $10,000. Remain fully anonymous while surfing and placing orders.",
            },
            {
              name: "Advanced Refund Methods",
              desc: "Avoid bans, dodge rebills, win failed claims. Succeed where others have failed.",
            },
            {
              name: "No Filler, No BS",
              desc: "After significant investment, we offer only the most precise and actionable methods with lifetime support.",
            },
          ]}
        />

        {/* Payment Section */}
        <PaymentSection />

        {/* Trust Building */}
        <StorySection
          subtitle="Our Story"
          title="Why We Built This"
          reverse={true}
          body={[
            "In 2019, we relied entirely on Amazon selling. Then everything changed. Accounts suspended. No real support. Only generic policy responses.",
            "That setback was crushing. But it forced us to find a solution. We persevered through countless trials. We discovered the method. We recovered.",
            "For six months after that, we dedicated ourselves to understanding how to safely create multiple accounts. We researched store algorithms. We tested everything.",
            "Now we're sharing this knowledge. Not because we need to. But because you deserve to know the truth about how these systems actually work.",
          ]}
          delay={0.1}
        />

        {/* Pricing */}
        <PricingSection />

        {/* Final CTA */}
        <ScrollReveal delay={0.2}>
          <section className="relative py-24 sm:py-32">
            <div className="container-px">
              <div className="space-y-8 text-center">
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                    // The Choice is Yours
                  </p>
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
                    Stop Failing. Start Winning.
                  </h2>
                  <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-white/80">
                    You now know what it takes. The question is: are you ready
                    to implement it?
                  </p>
                </motion.div>
                <motion.div
                  className="flex flex-col gap-4 sm:flex-row sm:justify-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <MagneticButton
                    href="https://refundgod.bgng.io/"
                    external
                    variant="primary"
                  >
                    Shop Methods
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m12 5 7 7-7 7M5 12h14" />
                    </svg>
                  </MagneticButton>
                </motion.div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Spacer for scrolling */}
        <div className="h-16 sm:h-32" />
      </main>
    </>
  );
}
