NAME=main
GREEN=002
YELLOW=003
BLUE=004

define compile_tex
 	pdflatex -synctex=1 -draftmode -interaction=batchmode -shell-escape $(1).tex ; \
 	biber $(1) ; \
 	pdflatex -synctex=1 -draftmode -interaction=batchmode -shell-escape $(1).tex ; \
 	pdflatex -synctex=1 -interaction=batchmode -shell-escape $(1).tex ; \
	echo ""
endef

define pretty_print
	@printf "\e[38;05;$(1)m[make]: $(2)\e[m\n"
endef

.PHONY: clean FORCE_MAKE

all: $(NAME).pdf

open: $(NAME).pdf
open:
	@echo ""
	$(call pretty_print,$(BLUE),opening Preview...)
	@open $(NAME).pdf
	$(call pretty_print,$(GREEN),✓ done!)

%.pdf: %.tex FORCE_MAKE
	$(call pretty_print,$(BLUE),compiling...)
	@echo ""
	$(call compile_tex,$(basename $<))
	$(call pretty_print,$(GREEN),✓ done!)

clean:
	$(call pretty_print,$(BLUE),cleaning up...)
	@echo ""
	@cat ./.make/art/maid.ascii
	@echo "\n"
	$(RM) $(NAME).{acn,glo,ist,run.xml,upa,upb,bcf,aux,bbl,blg,lof,log,synctex.gz,toc,pdf} texput.log
	@echo ""
	$(call pretty_print,$(GREEN),✓ done!)
