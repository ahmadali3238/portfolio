import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, ExternalLink } from "lucide-react";
import Image from "next/image";
import { FadeInCard } from "@/components/motion/FadeInCard";
import SectionWrapper from "@/components/SectionWrapper";
import { EXPERIENCES_WITH_LOGOS as EXPERIENCES } from "@/constants/data";

export default function ExperienceSection() {
  return (
    <SectionWrapper id="experience" eyebrow="Browse My" title="Experience">
      <div className="mb-20">
        <h3 className="text-2xl font-semibold text-center mb-12 text-foreground">
          Professional Experience
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {EXPERIENCES.map((exp, index) => (
            <FadeInCard key={index} index={index}>
              <article aria-labelledby={`experience-item-${index}`}>
                <Card className="group hover:shadow-elegant transition-all duration-300 card-elevated relative overflow-hidden h-full">
                  {exp.current && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground">
                        Current
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        {(() => {
                          const logoBox = (
                            <div className="w-16 h-16 rounded-lg bg-white p-2 shadow-card hover:shadow-glow transition-all duration-300 flex items-center justify-center overflow-hidden">
                              {exp.logo ? (
                                <Image
                                  src={exp.logo}
                                  alt={`Logo of ${exp.company}`}
                                  width={64}
                                  height={64}
                                  className="w-full h-full rounded-lg object-contain transition-transform duration-300 group-hover/logo:scale-110"
                                  loading="lazy"
                                  sizes="64px"
                                />
                              ) : (
                                <span className="text-2xl font-bold text-primary">
                                  {exp.company.charAt(0)}
                                </span>
                              )}
                            </div>
                          );

                          return exp.website ? (
                            <a
                              href={exp.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group/logo"
                              aria-label={`Visit ${exp.company}`}
                            >
                              {logoBox}
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300">
                                <ExternalLink className="w-3 h-3 text-primary-foreground" />
                              </div>
                            </a>
                          ) : (
                            <div className="relative">{logoBox}</div>
                          );
                        })()}
                      </div>
                      <div className="text-center space-y-2">
                        <h4
                          id={`experience-item-${index}`}
                          className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors duration-300"
                        >
                          {exp.title}
                        </h4>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {exp.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">{exp.duration}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {exp.description}
                    </p>
                    {exp.website && (
                      <a
                        href={exp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        Visit {exp.company}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              </article>
            </FadeInCard>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
